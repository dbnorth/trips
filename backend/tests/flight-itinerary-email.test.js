/**
 * Feature 86 — Flight Itinerary Email
 * Spec: features/feature-86-flight-itinerary-email.md
 */

import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import ensureSchema from "../app/scripts/ensureSchema.js";
import { emailTransport } from "../app/utils/emailDelivery.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import { seedEmailTemplates } from "../app/scripts/seedEmailTemplates.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  findRole,
} from "./helpers.js";

const SEED_TEMPLATES = JSON.parse(fs.readFileSync(path.resolve("app/data/emailTemplates.json"), "utf8"));

const ANA_ARRIVAL = [
  "American Airlines AA 100: BNA (Nashville) March 1, 2027 8:00 AM to MIA (Miami) March 1, 2027 11:00 AM, Economy, seat 12A",
  "American Airlines AA 200: MIA (Miami) March 1, 2027 1:00 PM to GUA (Guatemala City) March 1, 2027 4:30 PM, Economy",
].join("\n");
const ANA_RETURN =
  "American Airlines AA 300: GUA (Guatemala City) March 10, 2027 9:00 AM to BNA (Nashville) March 10, 2027 2:00 PM, Economy, seat 8B";

const segment = (segmentType, segmentNumber, fields) => ({
  segmentType,
  segmentNumber,
  airlineCode: "AA",
  cabinClass: "Economy",
  ...fields,
});

const ANA_SEGMENTS = [
  segment("arrival", 1, {
    flightNumber: "100",
    departureAirportCode: "BNA",
    departureDate: "2027-03-01",
    departureTime: "08:00",
    arrivalAirportCode: "MIA",
    arrivalDate: "2027-03-01",
    arrivalTime: "11:00",
    seatNumber: "12A",
  }),
  segment("arrival", 2, {
    flightNumber: "200",
    departureAirportCode: "MIA",
    departureDate: "2027-03-01",
    departureTime: "13:00",
    arrivalAirportCode: "GUA",
    arrivalDate: "2027-03-01",
    arrivalTime: "16:30",
  }),
  segment("return", 1, {
    flightNumber: "300",
    departureAirportCode: "GUA",
    departureDate: "2027-03-10",
    departureTime: "09:00",
    arrivalAirportCode: "BNA",
    arrivalDate: "2027-03-10",
    arrivalTime: "14:00",
    seatNumber: "8B",
  }),
];

describe("Feature 86 — Flight Itinerary Email", () => {
  let originalCreate;
  let savedEmailMode;
  let messages;

  const addTripPerson = async (trip, roleName, { email, firstName, lastName }) => {
    const user = await registerUser({ email, firstName, lastName });
    const assignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: user.user.personId,
      roleId: (await findRole(roleName)).id,
      status: "approved",
    });
    return { ...user, assignment };
  };

  const segmentsUrl = (trip, assignment) => `/trips/trips/${trip.id}/flights/${assignment.id}/segments`;

  /** The Gherkin background: Hope Missions' Guatemala trip, Omar, Tom, Alex, Ana with flights, Ben without. */
  const setup = async () => {
    await ensureSchema();
    await seedEmailTypes();
    await seedEmailTokens();
    const sys = await createSystemAdminUser({ email: "itin-sys@example.com" });
    const omar = await createOrgAdminUser({ email: "itin-omar@example.com", orgName: "Hope Missions" });
    const org = omar.org;
    await org.update({ email: "office@hope.example.org" });
    const trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic 2027",
      status: "active",
      startDate: "2027-03-01",
      endDate: "2027-03-10",
    });

    for (const [code, city] of [
      ["BNA", "Nashville"],
      ["MIA", "Miami"],
      ["GUA", "Guatemala City"],
    ]) {
      const airport = await request(app)
        .post("/trips/airports")
        .set(sys.authHeader)
        .send({ code, airportName: `${city} Intl`, city, country: "US" });
      expect(airport.status).toBe(200);
    }
    const airline = await request(app)
      .post("/trips/airlines")
      .set(sys.authHeader)
      .send({ code: "AA", name: "American Airlines" });
    expect(airline.status).toBe(200);

    const tom = await addTripPerson(trip, "Trip Leader", {
      email: "itin-tom@example.com",
      firstName: "Tom",
      lastName: "Reyes",
    });
    const ana = await addTripPerson(trip, "Trip Participant", {
      email: "itin-ana@example.com",
      firstName: "Ana",
      lastName: "Lopez",
    });
    const ben = await addTripPerson(trip, "Trip Participant", {
      email: "itin-ben@example.com",
      firstName: "Ben",
      lastName: "Cruz",
    });
    const alex = await registerUser({ email: "itin-alex@example.com", firstName: "Alex", lastName: "Agent" });
    await db.orgPeopleRole.create({
      orgId: org.id,
      peopleId: alex.user.personId,
      roleId: (await findRole("Agent")).id,
    });

    const saved = await request(app)
      .put(segmentsUrl(trip, ana.assignment))
      .set(omar.authHeader)
      .send({ confirmationNumber: "QX7P2M", segments: ANA_SEGMENTS });
    expect(saved.status).toBe(200);

    const seed = SEED_TEMPLATES.templates.find((t) => t.typeCode === "flight-itinerary");
    const itineraryType = await db.emailType.findOne({ where: { typeCode: "flight-itinerary" } });
    const itinerary = await db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: itineraryType.id,
      functionCode: seed.functionCode,
      fromEmail: seed.fromEmail,
      toAddress: seed.toAddress,
      subject: seed.subject,
      emailBody: seed.emailBody,
    });
    const updateType = await db.emailType.create({
      typeCode: "trip-team-update",
      description: "Trip team update",
      eventCode: "team-email",
    });
    const teamUpdate = await db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: updateType.id,
      functionCode: "Trip Participant",
      fromEmail: "{{ORG_EMAIL}}",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      subject: "Trip team update",
      emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}.",
    });

    return { org, trip, omar, tom, ana, ben, alex, itinerary, teamUpdate };
  };

  const sendItinerary = (trip, template, auth, body = {}) =>
    request(app)
      .post(`/trips/trips/${trip.id}/flight-itinerary-email`)
      .set(auth)
      .send({
        emailTemplateId: template.id,
        subject: template.subject,
        emailBody: template.emailBody,
        sendTo: "accepted",
        ...body,
      });

  beforeAll(async () => {
    await syncTestDatabase();
    originalCreate = emailTransport.create;
  });

  beforeEach(() => {
    savedEmailMode = process.env.EMAIL_MODE;
    messages = [];
    process.env.EMAIL_MODE = "smtp";
    emailTransport.create = () => ({
      sendMail: async (message) => {
        messages.push(message);
        return { messageId: `id-${messages.length}` };
      },
    });
  });

  afterEach(async () => {
    emailTransport.create = originalCreate;
    if (savedEmailMode === undefined) delete process.env.EMAIL_MODE;
    else process.env.EMAIL_MODE = savedEmailMode;
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-86.1 — Flight tokens list each flight's segments", () => {
    it("Flight tokens list each flight's segments", async () => {
      const { org, trip, omar, ana, ben } = await setup();
      const previewFor = (personId) =>
        request(app)
          .post("/trips/email-templates/preview")
          .set(omar.authHeader)
          .send({
            orgId: org.id,
            tripId: trip.id,
            personId,
            subject: "Flights",
            emailBody: "{{FLIGHT_CONFIRMATION_NUM}} / {{ARRIVAL_FLIGHT}} / {{RETURN_FLIGHT}}",
          });

      const forAna = await previewFor(ana.user.personId);
      expect(forAna.status).toBe(200);
      // The preview shows the token's line breaks as <br>.
      expect(forAna.body.emailBody).toBe(`QX7P2M / ${ANA_ARRIVAL.replace("\n", "<br>")} / ${ANA_RETURN}`);

      const forBen = await previewFor(ben.user.personId);
      expect(forBen.status).toBe(200);
      expect(forBen.body.emailBody).toBe(" /  / ");
    });

    it("The confirmation number is saved with the flight segments", async () => {
      const { trip, tom, ana } = await setup();
      const url = segmentsUrl(trip, ana.assignment);
      const savedNumber = async () =>
        (await db.tripFlight.findOne({ where: { tripPeopleRoleId: ana.assignment.id } })).confirmationNumber;

      const save = await request(app)
        .put(url)
        .set(tom.authHeader)
        .send({ confirmationNumber: " LM4K9Z ", segments: ANA_SEGMENTS });
      expect(save.status).toBe(200);
      expect(await savedNumber()).toBe("LM4K9Z");

      const tooLong = await request(app)
        .put(url)
        .set(tom.authHeader)
        .send({ confirmationNumber: "X".repeat(51), segments: ANA_SEGMENTS.slice(0, 1) });
      expect(tooLong.status).toBe(400);
      expect(tooLong.body.message).toBe("Confirmation number must be 50 characters or fewer.");
      expect(await savedNumber()).toBe("LM4K9Z");
      expect(await db.tripFlightSegment.count()).toBe(3);

      const withoutNumber = await request(app).put(url).set(tom.authHeader).send({ segments: ANA_SEGMENTS });
      expect(withoutNumber.status).toBe(200);
      expect(await savedNumber()).toBe("LM4K9Z");

      const readBack = await request(app).get(url).set(tom.authHeader);
      expect(readBack.status).toBe(200);
      expect(readBack.body.confirmationNumber).toBe("LM4K9Z");
    });

    it("Seeds add the flight itinerary tokens, type, and template", async () => {
      const seedOrg = await db.organization.create({
        name: "Health Talents International",
        email: "info@example.org",
      });

      await seedEmailTypes();
      await seedEmailTokens();
      await seedEmailTemplates();

      const tokens = await db.emailToken.findAll({
        where: { tokenCode: ["ARRIVAL_FLIGHT", "RETURN_FLIGHT", "FLIGHT_CONFIRMATION_NUM"] },
      });
      expect(Object.fromEntries(tokens.map((t) => [t.tokenCode, t.valueSource]))).toEqual({
        ARRIVAL_FLIGHT: "participant.arrivalFlight",
        RETURN_FLIGHT: "participant.returnFlight",
        FLIGHT_CONFIRMATION_NUM: "participant.flightConfirmationNumber",
      });
      const type = await db.emailType.findOne({ where: { typeCode: "flight-itinerary" } });
      expect([type.description, type.eventCode]).toEqual(["Flight itinerary", "team-email"]);
      const template = await db.emailTemplate.findOne({ where: { orgId: seedOrg.id, emailTypeId: type.id } });
      expect(template.functionCode).toBe("Trip Participant");
      expect(template.subject).toBe("Your {{TRIP_NAME}} flight itinerary");
      expect(template.emailBody).toContain("Confirmation number: {{FLIGHT_CONFIRMATION_NUM}}");
    });
  });

  describe("US-86.2 — Email the flight itinerary from the Flights page", () => {
    it("Only flight itinerary templates are offered", async () => {
      const { trip, tom, itinerary, teamUpdate } = await setup();

      const templates = await request(app)
        .get(`/trips/trips/${trip.id}/flight-itinerary-email/templates`)
        .set(tom.authHeader);
      expect(templates.status).toBe(200);
      expect(templates.body.map((t) => t.id)).toEqual([itinerary.id]);
      expect(templates.body[0].subject).toBe("Your {{TRIP_NAME}} flight itinerary");

      const send = await sendItinerary(trip, teamUpdate, tom.authHeader);
      expect(send.status).toBe(400);
      expect(send.body.message).toBe("Choose a flight itinerary template for this trip.");
      expect(messages).toEqual([]);
    });

    it("The flight itinerary goes to each participant with their own flights", async () => {
      const { trip, tom, ben, itinerary } = await setup();

      const send = await sendItinerary(trip, itinerary, tom.authHeader);

      expect(send.status).toBe(200);
      expect(send.body).toMatchObject({ sent: 1, skipped: 1, failed: 0 });
      expect(send.body.results.find((r) => r.personId === ben.user.personId)).toMatchObject({
        status: "skipped",
        reason: "No flight segments.",
      });
      expect(messages.map((m) => m.to)).toEqual(["itin-ana@example.com"]);
      const [toAna] = messages;
      expect(toAna.subject).toBe("Your Guatemala Clinic 2027 flight itinerary");
      expect(toAna.text).toContain("Confirmation number: QX7P2M");
      expect(toAna.text).toContain(`Arrival flight:\n${ANA_ARRIVAL}`);
      expect(toAna.text).toContain(`Return flight:\n${ANA_RETURN}`);

      const preview = await request(app)
        .post(`/trips/trips/${trip.id}/flight-itinerary-email/preview`)
        .set(tom.authHeader)
        .send({
          emailTemplateId: itinerary.id,
          subject: itinerary.subject,
          emailBody: itinerary.emailBody,
          sendTo: "accepted",
          personId: ben.user.personId,
        });
      expect(preview.status).toBe(400);
      expect(preview.body.message).toBe("No flight segments.");
    });

    it("An Agent can email the flight itinerary", async () => {
      const { trip, alex, ana, itinerary } = await setup();

      const send = await sendItinerary(trip, itinerary, alex.authHeader, {
        sendTo: "selected",
        personIds: [ana.user.personId],
      });

      expect(send.status).toBe(200);
      expect(send.body).toMatchObject({ sent: 1, skipped: 0, failed: 0 });
      expect(messages.map((m) => m.to)).toEqual(["itin-ana@example.com"]);
    });

    it("Only users who can open the Flights page can send it", async () => {
      const { trip, ana, itinerary } = await setup();

      const templates = await request(app)
        .get(`/trips/trips/${trip.id}/flight-itinerary-email/templates`)
        .set(ana.authHeader);
      expect(templates.status).toBe(403);

      const send = await sendItinerary(trip, itinerary, ana.authHeader);
      expect(send.status).toBe(403);
      expect(messages).toEqual([]);
    });
  });
});
