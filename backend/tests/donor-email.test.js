/**
 * Feature 130 — Donor Maintenance
 * Spec: features/feature-130-donor-maintenance.md
 */

import { Op } from "sequelize";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { seedEmailTemplates } from "../app/scripts/seedEmailTemplates.js";
import { emailCalendarYear } from "../app/utils/emailTokenValues.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  createOrganization,
  findRole,
  registerUser,
} from "./helpers.js";
import { fakeStripe, payWithStripe, saveStripeKeys } from "./stripeFake.js";

describe("Feature 130 — Donor email", () => {
  let admin;
  let org;

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    admin = await createOrgAdminUser({ email: "donor-mail@example.com", orgName: "Hope Mission" });
    org = admin.org;
    await org.update({ email: "office@example.org" });
    await seedEmailTypes();
    await seedEmailTokens();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const sentEmails = () =>
    db.emailLog.findAll({ where: { subject: { [Op.ne]: "Login" } }, order: [["id", "ASC"]] });

  const addDonor = (fields) =>
    db.donor.create({ orgId: org.id, status: "active", ...fields });

  const addTrip = (name, startDate = "2026-12-01") =>
    db.trip.create({ orgId: org.id, name, status: "active", startDate, endDate: "2026-12-10" });

  const addTemplate = async (typeCode, fields) => {
    const emailType = await db.emailType.findOne({ where: { typeCode } });
    return db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: emailType.id,
      functionCode: "Donor",
      fromEmail: "office@example.org",
      toAddress: "{{DONOR_EMAIL}}",
      subject: "Note",
      emailBody: "Hello",
      ...fields,
    });
  };

  it("Donor templates are organization only", async () => {
    const emailType = await db.emailType.findOne({ where: { typeCode: "donor-update" } });
    const trip = await addTrip("Guatemala Clinic");

    const saved = await request(app).post("/trips/email-templates").set(admin.authHeader).send({
      orgId: org.id,
      emailTypeId: emailType.id,
      functionCode: "Donor",
      subject: "A note",
      fromEmail: "office@example.org",
      toAddress: "{{DONOR_EMAIL}}",
      emailBody: "Hello {{DONOR_FIRST_NAME}}",
    });
    expect(saved.status).toBe(200);
    expect(saved.body.functionCode).toBe("Donor");
    expect(saved.body.tripId).toBeNull();
    expect(saved.body.scheduleRule).toBeNull();

    const refused = await request(app).post("/trips/email-templates").set(admin.authHeader).send({
      orgId: org.id,
      tripId: trip.id,
      emailTypeId: emailType.id,
      functionCode: "Donor",
      subject: "A note",
      fromEmail: "office@example.org",
      toAddress: "{{DONOR_EMAIL}}",
      emailBody: "Hello",
    });
    expect(refused.status).toBe(400);
    expect(refused.body.message).toBe("Donor templates cannot belong to a trip.");
  });

  it("Donor tokens fill from the donor", async () => {
    const ana = await addDonor({ firstName: "Ana", email: "ana@example.com" });
    const template = await addTemplate("donor-update", {
      emailBody: "{{DONOR_FIRST_NAME}} {{DONOR_EMAIL}} {{TRIP_NAME}}",
    });

    const preview = await request(app).post("/trips/donor-email/preview").set(admin.authHeader).send({
      emailTemplateId: template.id,
      subject: "Note",
      emailBody: template.emailBody,
      donorId: ana.id,
    });
    expect(preview.status).toBe(200);
    expect(preview.body.body).toContain("Ana");
    expect(preview.body.body).toContain("ana@example.com");
    expect(preview.body.body).not.toContain("{{TRIP_NAME}}");
    expect(preview.body.to).toBe("ana@example.com");
  });

  it("A Donor template is seeded", async () => {
    const seedOrg = await createOrganization("Health Talents International");
    await seedOrg.update({ email: "info@example.org" });
    await seedEmailTemplates();

    const template = await db.emailTemplate.findOne({
      where: { orgId: seedOrg.id, subject: "A note from {{ORG_NAME}}" },
    });
    expect(template.functionCode).toBe("Donor");
    const tokens = await db.emailToken.findAll({
      where: { tokenCode: ["DONOR_FIRST_NAME", "DONOR_LAST_NAME", "DONOR_EMAIL"] },
      order: [["tokenCode", "ASC"]],
    });
    expect(tokens.map((token) => [token.tokenCode, token.description])).toEqual([
      ["DONOR_EMAIL", "Donor email"],
      ["DONOR_FIRST_NAME", "Donor first name"],
      ["DONOR_LAST_NAME", "Donor last name"],
    ]);
  });

  it("Previous year donations list the date, amount, trip, and participant", async () => {
    const year = emailCalendarYear() - 1;
    const ana = await addDonor({ firstName: "Ana", email: "ana@example.com" });
    const pat = await db.person.create({ firstName: "Pat", lastName: "Lee", email: "pat@example.com" });
    const guatemala = await addTrip("Guatemala Clinic");
    const honduras = await addTrip("Honduras Clinic");
    await db.tripDonation.create({
      tripId: guatemala.id,
      donorId: ana.id,
      personId: pat.id,
      amount: 50,
      dateTime: `${year}-03-02T18:00:00.000Z`,
      donationType: "Stripe-Credit",
      paymentStatus: "succeeded",
    });
    await db.tripDonation.create({
      tripId: honduras.id,
      donorId: ana.id,
      amount: 25,
      dateTime: `${year}-11-20T18:00:00.000Z`,
      donationType: "Check",
    });
    await db.tripDonation.create({
      tripId: guatemala.id,
      donorId: ana.id,
      amount: 10,
      dateTime: `${emailCalendarYear()}-01-15T18:00:00.000Z`,
      donationType: "Stripe-Credit",
      paymentStatus: "succeeded",
    });
    await db.tripDonation.create({
      tripId: guatemala.id,
      donorId: ana.id,
      amount: 40,
      dateTime: `${year}-06-01T18:00:00.000Z`,
      donationType: "Stripe-Credit",
      paymentStatus: "failed",
    });
    const template = await addTemplate("annual-donation", {
      emailBody: "{{DONOR_PREVIOUS_YEAR_DONATIONS}}\n{{DONOR_PREVIOUS_YEAR_TOTAL}}",
    });

    const preview = await request(app).post("/trips/donor-email/preview").set(admin.authHeader).send({
      emailTemplateId: template.id,
      subject: "Annual",
      emailBody: template.emailBody,
      donorId: ana.id,
    });
    expect(preview.status).toBe(200);
    const body = preview.body.body;
    const first = `03/02/${year} — $50.00 — Guatemala Clinic — Pat Lee`;
    const second = `11/20/${year} — $25.00 — Honduras Clinic`;
    expect(body.indexOf(first)).toBeGreaterThanOrEqual(0);
    expect(body.indexOf(second)).toBeGreaterThan(body.indexOf(first));
    expect(preview.body.body).toContain("$75.00");
    expect(preview.body.body).not.toContain("$10.00");
    expect(preview.body.body).not.toContain("$40.00");
  });

  it("The annual donation template is seeded", async () => {
    const seedOrg = await createOrganization("Health Talents International");
    await seedOrg.update({ email: "info@example.org" });
    await seedEmailTemplates();

    const template = await db.emailTemplate.findOne({
      where: { orgId: seedOrg.id, subject: "Your annual donations to {{ORG_NAME}}" },
    });
    expect(template.functionCode).toBe("Donor");
    expect(template.emailBody).toContain("{{DONOR_PREVIOUS_YEAR_DONATIONS}}");
    expect(template.emailBody).toContain("{{DONOR_PREVIOUS_YEAR_TOTAL}}");
  });

  it("The donor thank-you template is seeded", async () => {
    const seedOrg = await createOrganization("Health Talents International");
    await seedOrg.update({ email: "info@example.org" });
    await seedEmailTemplates();

    const template = await db.emailTemplate.findOne({
      where: { orgId: seedOrg.id, subject: "Thank you for your donation" },
      include: [{ model: db.emailType }],
    });
    expect(template.functionCode).toBe("Send Now");
    expect(template.emailType.eventCode).toBe("donor-thank-you");
  });

  it("Donated this year limits the list", async () => {
    const year = emailCalendarYear();
    const ana = await addDonor({ firstName: "Ana", lastName: "Lopez", email: "ana@example.com" });
    const ben = await addDonor({ firstName: "Ben", lastName: "Lopez", email: "ben@example.com" });
    const cy = await addDonor({ firstName: "Cy", lastName: "Lopez", email: "cy@example.com" });
    const trip = await addTrip("Guatemala Clinic");
    await db.tripDonation.create({
      tripId: trip.id,
      donorId: ana.id,
      amount: 50,
      dateTime: `${year}-02-02T18:00:00.000Z`,
      paymentStatus: "succeeded",
    });
    await db.tripDonation.create({
      tripId: trip.id,
      donorId: ben.id,
      amount: 25,
      dateTime: `${year - 1}-11-20T18:00:00.000Z`,
      paymentStatus: "succeeded",
    });
    await db.tripDonation.create({
      tripId: trip.id,
      donorId: cy.id,
      amount: 10,
      dateTime: `${year}-04-04T18:00:00.000Z`,
      paymentStatus: "failed",
    });

    const list = await request(app)
      .post("/trips/donor-email/recipients")
      .set(admin.authHeader)
      .send({ scope: "this-year" });
    expect(list.status).toBe(200);
    expect(list.body.map((donor) => donor.firstName)).toEqual(["Ana"]);
  });

  it("Donated to a trip lists that trip's donors", async () => {
    const ana = await addDonor({ firstName: "Ana", lastName: "Lopez", email: "ana@example.com" });
    const ben = await addDonor({ firstName: "Ben", lastName: "Cruz", email: "ben@example.com" });
    const guatemala = await addTrip("Guatemala Clinic", "2026-12-01");
    const honduras = await addTrip("Honduras Clinic", "2026-06-01");
    await db.tripDonation.create({
      tripId: guatemala.id,
      donorId: ana.id,
      amount: 20,
      dateTime: "2026-03-02T18:00:00.000Z",
      donationType: "Check",
    });
    await db.tripDonation.create({
      tripId: honduras.id,
      donorId: ben.id,
      amount: 20,
      dateTime: "2026-03-02T18:00:00.000Z",
      donationType: "Check",
    });

    const list = await request(app)
      .post("/trips/donor-email/recipients")
      .set(admin.authHeader)
      .send({ scope: "trip", tripId: guatemala.id });
    expect(list.status).toBe(200);
    expect(list.body.map((donor) => donor.firstName)).toEqual(["Ana"]);
  });

  it("Send goes to the checked donors", async () => {
    const ana = await addDonor({ firstName: "Ana", lastName: "Lopez", email: "ana@example.com" });
    await addDonor({ firstName: "Ben", lastName: "Lopez", email: "ben@example.com" });
    const template = await addTemplate("donor-update", { subject: "Hello donors", emailBody: "Hi {{DONOR_FIRST_NAME}}" });

    const sent = await request(app).post("/trips/donor-email/send").set(admin.authHeader).send({
      emailTemplateId: template.id,
      subject: "Hello donors",
      emailBody: "Hi {{DONOR_FIRST_NAME}}",
      donorIds: [ana.id],
    });
    expect(sent.status).toBe(200);
    expect(`Sent ${sent.body.sent}, skipped ${sent.body.skipped}, failed ${sent.body.failed}`).toBe(
      "Sent 1, skipped 0, failed 0"
    );
    const logs = await sentEmails();
    expect(logs.map((log) => log.toEmail)).toEqual(["ana@example.com"]);
  });

  it("A No Email donor cannot be included", async () => {
    const ben = await addDonor({ firstName: "Ben", email: "ben@example.com", status: "dontcontact" });
    const template = await addTemplate("donor-update");

    const sent = await request(app).post("/trips/donor-email/send").set(admin.authHeader).send({
      emailTemplateId: template.id,
      subject: "Hello",
      emailBody: "Hi",
      donorIds: [ben.id],
    });
    expect(sent.status).toBe(400);
    expect(sent.body.message).toBe("Donors marked No Email can't be emailed.");
    expect(await sentEmails()).toEqual([]);
  });

  it("The thank-you still goes to a No Email donor", async () => {
    const ben = await addDonor({ firstName: "Ben", email: "ben@example.com", status: "dontcontact" });
    const trip = await addTrip("Guatemala Clinic");
    await addTemplate("trip-donation", {
      functionCode: "Send Now",
      subject: "Thank you for your donation to {{TRIP_NAME}}",
      emailBody: "Thank you",
      toAddress: "{{DONOR_EMAIL}}",
    });

    const saved = await request(app).post("/trips/donations").set(admin.authHeader).send({
      tripId: trip.id,
      amount: 25,
      dateTime: "2026-10-15T18:00:00.000Z",
      donationType: "Check",
      checkNumber: "1001",
      donorId: ben.id,
    });
    expect(saved.status).toBe(200);
    const logs = await sentEmails();
    expect(logs.some((log) => log.toEmail === "ben@example.com")).toBe(true);
  });

  it("A donor who enters a donation is thanked", async () => {
    const trip = await addTrip("Guatemala Clinic");
    const participantRole = await findRole("Trip Participant");
    const pat = await registerUser({
      email: "pat.lee@example.com",
      firstName: "Pat",
      lastName: "Lee",
      orgIds: [org.id],
    });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: pat.user.personId,
      roleId: participantRole.id,
      status: "approved",
    });
    await addTemplate("donor-thank-you", {
      functionCode: "Send Now",
      subject: "Thank you for your donation",
      emailBody: "Hi {{DONOR_FIRST_NAME}}, {{DONATION_AMOUNT}} for {{TRIP_NAME}}",
    });
    await saveStripeKeys(org);
    const stripe = fakeStripe();
    try {
      const paid = await payWithStripe(stripe, {
        path: "/trips/public/donations/stripe-checkout",
        body: {
          tripId: trip.id,
          personId: pat.user.personId,
          amount: 50,
          donor: { firstName: "Ana", email: "ana@example.com" },
        },
      });
      expect(paid.start.status).toBe(200);
      expect(paid.check.status).toBe(200);
    } finally {
      stripe.restore();
    }

    const logs = (await sentEmails()).filter((log) => log.subject === "Thank you for your donation");
    expect(logs.map((log) => log.toEmail)).toEqual(["ana@example.com"]);
    expect(logs[0].content).toContain("Ana");
    expect(logs[0].content).toContain("$50.00");
    expect(logs[0].content).toContain("Guatemala Clinic");
  });

  it("Staff entry does not send the donor thank-you", async () => {
    const ana = await addDonor({ firstName: "Ana", email: "ana@example.com" });
    const trip = await addTrip("Guatemala Clinic");
    await addTemplate("donor-thank-you", {
      functionCode: "Send Now",
      subject: "Thank you for your donation",
      emailBody: "Hi {{DONOR_FIRST_NAME}}",
    });
    await addTemplate("trip-donation", {
      functionCode: "Send Now",
      subject: "Trip donation note",
      emailBody: "Thank you",
    });

    const saved = await request(app).post("/trips/donations").set(admin.authHeader).send({
      tripId: trip.id,
      amount: 25,
      dateTime: "2026-10-15T18:00:00.000Z",
      donationType: "Check",
      checkNumber: "1002",
      donorId: ana.id,
    });
    expect(saved.status).toBe(200);
    const logs = await sentEmails();
    expect(logs.some((log) => log.subject === "Thank you for your donation")).toBe(false);
    expect(logs.some((log) => log.subject === "Trip donation note")).toBe(true);
  });
});
