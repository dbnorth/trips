/**
 * Feature 80 — Import Trip Master CSV
 * Spec: features/feature-80-trip-master-import.md
 */

import fs from "fs";
import path from "path";
import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import { emailTransport } from "../app/utils/emailDelivery.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import { seedEmailTemplates } from "../app/scripts/seedEmailTemplates.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
} from "./helpers.js";

const SAMPLE = fs.readFileSync(path.resolve("tests/fixtures/trip-master-sample.csv"));
const SEED_TEMPLATES = JSON.parse(fs.readFileSync(path.resolve("app/data/emailTemplates.json"), "utf8"));
const ENV_KEYS = ["EMAIL_MODE", "EMAIL_FILE_DIR", "APP_URL"];
const LYLE_LINK = "http://localhost:8082/?create=1&email=lyle%40example.org&firstName=Lyle&lastName=Lowry";

describe("Feature 80 — Import Trip Master CSV", () => {
  let savedEnv;
  let originalCreate;
  let omar;
  let org;
  let trip;
  let surgeonRole;
  let circulatorRole;
  let options;
  let ana;
  let tom;
  let pat;

  const importFile = (auth, content = SAMPLE, filename = "trip-master-sample.csv") =>
    request(app)
      .post(`/trips/trips/${trip.id}/import-trip-master`)
      .set(auth)
      .attach("file", Buffer.from(content), { filename, contentType: "text/csv" });

  const personNamed = (firstName, lastName) => db.person.findOne({ where: { firstName, lastName } });

  const assignmentOf = async (person) =>
    db.tripPeopleRole.findOne({
      where: { tripId: trip.id, peopleId: person.id },
      include: [{ model: db.role, as: "role" }],
    });

  const selectedOptions = async (assignment) => {
    const rows = await db.tripPeopleRoleOption.findAll({
      where: { tripPeopleRoleId: assignment.id, selected: true },
      include: [{ model: db.tripTravelOption, as: "tripTravelOption" }],
      order: [["tripTravelOptionId", "ASC"]],
    });
    return rows.map((row) => row.tripTravelOption.description);
  };

  const orgRoleNames = async (person) => {
    const links = await db.orgPeopleRole.findAll({
      where: { orgId: org.id, peopleId: person.id },
      include: [{ model: db.role, as: "role" }],
    });
    return links.map((link) => link.role.roleName).sort();
  };

  beforeAll(async () => {
    await syncTestDatabase();
    originalCreate = emailTransport.create;
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    omar = await createOrgAdminUser({ email: "omar@example.org", orgName: "Hope Missions" });
    org = omar.org;
    await org.update({ email: "office@hope.org" });
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic 2027",
      location: "Antigua",
      status: "active",
      startDate: "2027-06-10",
      endDate: "2027-06-17",
      participantCost: 950,
    });
    options = {};
    for (const [key, description, setNumber, priceAdjustment] of [
      ["nameTag", "Need HTI Name Tag", 1, 0],
      ["friday", "Arrive Friday - Barceló Bar", 2, 75],
      ["saturday", "Arrive Saturday", 2, 0],
      ["flights", "HTI Purchase Flights", 3, 40],
    ]) {
      options[key] = await db.tripTravelOption.create({ tripId: trip.id, description, setNumber, priceAdjustment });
    }
    const surgeon = await db.workerRole.create({ orgId: org.id, name: "General Surgeon" });
    surgeonRole = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: surgeon.id, quantity: 1 });
    const circulator = await db.workerRole.create({ orgId: org.id, name: "RN Circulator" });
    circulatorRole = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: circulator.id, quantity: 2 });
    await db.documentType.create({ orgId: org.id, description: "Passport", type: "passport" });
    ana = await db.person.create({
      firstName: "Ana",
      lastName: "Lopez",
      email: "ana@example.org",
      phoneContryCode: "1",
      phoneNumber: "6155550100",
    });

    tom = await registerUser({ email: "tom@example.org", firstName: "Tom", lastName: "Reyes", orgIds: [org.id] });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: tom.user.personId,
      roleId: (await findRole("Trip Leader")).id,
      status: "approved",
    });

    pat = await registerUser({ email: "pat@example.org", firstName: "Pat", lastName: "Gray", orgIds: [org.id] });
    const otherTrip = await db.trip.create({ orgId: org.id, name: "Honduras 2027", status: "active" });
    await db.tripPeopleRole.create({
      tripId: otherTrip.id,
      peopleId: pat.user.personId,
      roleId: (await findRole("Trip Participant")).id,
      status: "approved",
    });
  });

  afterEach(async () => {
    emailTransport.create = originalCreate;
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-80.1 — Import a Trip Master CSV into a trip", () => {
    it("Import adds people and applications", async () => {
      const response = await importFile(omar.authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        rowCount: 6,
        added: 4,
        updated: 1,
        skipped: 1,
        notes: [
          { row: 13, name: "Jack Lawler", message: "On the waiting list." },
          {
            row: 16,
            name: "Andrea Fletcher",
            message: 'travel notes "Fri or Sat" match more than one option in Trip Option 2.',
          },
        ],
      });

      const lyle = await personNamed("Lyle", "Lowry");
      const kris = await personNamed("Kris", "Smith");
      const rick = await personNamed("Rick", "Harper");
      const andrea = await personNamed("Andrea", "Fletcher");
      const expected = [
        [lyle, "Trip Participant", "approved"],
        [ana, "Trip Participant", "approved"],
        [kris, "Trip Participant", "incomplete"],
        [andrea, "Trip Participant", "cancelled"],
        [rick, "Trip Leader", "approved"],
      ];
      for (const [person, roleName, status] of expected) {
        const assignment = await assignmentOf(person);
        expect([person.firstName, assignment.role.roleName, assignment.status]).toEqual([
          person.firstName,
          roleName,
          status,
        ]);
      }
      expect((await assignmentOf(rick)).isPrimaryLeader).toBe(true);
      expect(await orgRoleNames(rick)).toEqual(["Trip Leader", "Trip Participant"]);
      for (const person of [lyle, kris, andrea]) {
        expect(await orgRoleNames(person)).toEqual(["Trip Participant"]);
      }
      expect(await personNamed("Jack", "Lawler")).toBeNull();
      expect(await db.emailLog.count({ where: { subject: { [Op.ne]: "Login" } } })).toBe(0);
    });

    it("A file that isn't a Trip Master CSV is refused", async () => {
      const peopleBefore = await db.person.count();
      const notTripMaster = [
        "Contacts,,",
        "First,Last,Phone",
        "Name,Name,",
        "Lee,Park,6155550123",
      ].join("\n");

      const response = await importFile(omar.authHeader, notTripMaster, "contacts.csv");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "This file isn't a Trip Master CSV. Missing columns: E-Mail, Position Required."
      );
      expect(await db.person.count()).toBe(peopleBefore);
      expect(await db.tripPeopleRole.count({ where: { tripId: trip.id } })).toBe(1);

      const notCsv = await importFile(omar.authHeader, SAMPLE, "trip-master.txt");
      expect(notCsv.status).toBe(400);
      expect(notCsv.body.message).toBe("Choose a CSV file up to 5 MB.");
    });

    it("Who can import", async () => {
      expect((await importFile(tom.authHeader)).status).toBe(200);

      const forbidden = await importFile(pat.authHeader);
      expect(forbidden.status).toBe(403);
      expect(forbidden.body.message).toBe("Forbidden.");
    });
  });

  describe("US-80.2 — Reuse people who already exist", () => {
    it("An existing person only gets blank fields filled", async () => {
      await importFile(omar.authHeader);

      const lopez = await db.person.findAll({ where: { firstName: "Ana", lastName: "Lopez" } });
      expect(lopez.map((p) => p.id)).toEqual([ana.id]);
      expect(lopez[0].phoneNumber).toBe("6155550100");
      expect(lopez[0].birthDate).toBe("1976-01-21");
      expect(lopez[0].hasAllergies).toBe(false);
      const kris = await personNamed("Kris", "Smith");
      expect(kris.id).not.toBe(ana.id);
      expect(kris.email).toBe("ana@example.org");
    });

    it("Importing again adds nothing new", async () => {
      await importFile(omar.authHeader);
      const optionRows = await db.tripPeopleRoleOption.count({ where: { selected: true } });

      const again = await importFile(omar.authHeader);

      expect(again.body).toMatchObject({ added: 0, updated: 5, skipped: 1 });
      const assignments = await db.tripPeopleRole.findAll({
        where: { tripId: trip.id },
        include: [{ model: db.person, as: "person" }],
      });
      expect(assignments.map((a) => a.person.firstName).sort()).toEqual([
        "Ana",
        "Andrea",
        "Kris",
        "Lyle",
        "Rick",
        "Tom",
      ]);
      expect(await db.personDocument.count()).toBe(1);
      expect(await db.tripPeopleRoleOption.count({ where: { selected: true } })).toBe(optionRows);
      const lyle = await assignmentOf(await personNamed("Lyle", "Lowry"));
      expect(Number(lyle.participantCost)).toBe(1065);
    });
  });

  describe("US-80.3 — Positions match the trip's worker roles", () => {
    it("Positions match the trip's worker roles", async () => {
      await importFile(omar.authHeader);

      await surgeonRole.reload();
      expect(surgeonRole.quantity).toBe(2);
      await circulatorRole.reload();
      expect(circulatorRole.quantity).toBe(3);
      expect(await db.tripWorkerRole.count({ where: { tripId: trip.id } })).toBe(2);

      const roleOf = async (first, last) => (await assignmentOf(await personNamed(first, last))).tripWorkerRoleId;
      expect(await roleOf("Lyle", "Lowry")).toBe(surgeonRole.id);
      expect(await roleOf("Ana", "Lopez")).toBe(circulatorRole.id);
      expect(await roleOf("Kris", "Smith")).toBe(circulatorRole.id);
      expect(await roleOf("Rick", "Harper")).toBeNull();
      expect(await roleOf("Andrea", "Fletcher")).toBeNull();
    });

    it("Positions missing from the trip stop the import", async () => {
      await circulatorRole.destroy();
      const peopleBefore = await db.person.count();
      const workerRolesBefore = await db.workerRole.count();

      const response = await importFile(omar.authHeader);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Add these worker roles to the trip, then import again.",
        missingRoles: ["RN Circulator"],
      });
      expect(await db.person.count()).toBe(peopleBefore);
      expect(await db.tripPeopleRole.count({ where: { tripId: trip.id } })).toBe(1);
      expect(await db.tripWorkerRole.count({ where: { tripId: trip.id } })).toBe(1);
      expect(await db.workerRole.count()).toBe(workerRolesBefore);
      await surgeonRole.reload();
      expect(surgeonRole.quantity).toBe(1);
    });
  });

  describe("US-80.4 — Import passports, allergies, emergency contacts, and roommates", () => {
    it("Extra columns are imported", async () => {
      await importFile(omar.authHeader);

      const lyle = await personNamed("Lyle", "Lowry");
      expect(lyle).toMatchObject({
        email: "lyle@example.org",
        birthDate: "1965-08-07",
        phoneContryCode: "1",
        phoneNumber: "9375701507",
        gender: "male",
        addLine1: "1940 Barnhart Road",
        city: "Troy",
        state_prov: "OH",
        postalCode: "45373",
        country: "US",
        emergencyContactName: "Nathan Lowry",
        emergencyContactPhoneCountryCode: "1",
        emergencyContactPhoneNumber: "9375706904",
        hasAllergies: true,
        allergiesDescription: "Amoxicillin",
        currentChurchHome: "Mid-County church of Christ",
      });
      const passport = await db.personDocument.findOne({
        where: { personId: lyle.id },
        include: [{ model: db.documentType, as: "documentType" }],
      });
      expect(passport.documentType.type).toBe("passport");
      expect(passport.documentNumber).toBe("581459085");
      expect(passport.expirationDate).toBe("2029-02-21");

      const assignment = await assignmentOf(lyle);
      expect(assignment.hasPreferredRoommate).toBe(true);
      expect(assignment.preferredRoommateNames).toBe("Alena Lowry");
    });
  });

  describe("US-80.5 — Imported participants create their own accounts", () => {
    it("Create account links to the imported person", async () => {
      await importFile(omar.authHeader);
      const imported = await personNamed("Lyle", "Lowry");

      const lyle = await registerUser({
        email: " Lyle@Example.org ",
        firstName: "Lyle",
        lastName: "Lowry",
        password: "lyle-pass-1",
      });

      expect(lyle.response.status).toBe(200);
      expect(lyle.token).toBeTruthy();
      expect(lyle.user.personId).toBe(imported.id);
      const person = await db.person.findByPk(imported.id);
      expect(person.userId).toBe(lyle.user.userId);
      expect(person.birthDate).toBe("1965-08-07");
      expect(await db.personDocument.count({ where: { personId: imported.id } })).toBe(1);

      const myTrips = await request(app)
        .get("/trips/trips/browse/mine")
        .query({ orgId: org.id })
        .set(lyle.authHeader);
      expect(myTrips.body.map((t) => [t.name, t.applicationStatus])).toEqual([
        ["Guatemala Clinic 2027", "approved"],
      ]);
    });

    it("Shared email links by name", async () => {
      await importFile(omar.authHeader);
      const importedKris = await personNamed("Kris", "Smith");

      const kris = await registerUser({
        email: "ana@example.org",
        firstName: "Kris",
        lastName: "Smith",
        password: "kris-pass-1",
      });

      expect(kris.response.status).toBe(200);
      expect(kris.user.personId).toBe(importedKris.id);
      expect((await db.person.findByPk(ana.id)).userId).toBeNull();

      const jo = await registerUser({
        email: "ana@example.org",
        firstName: "Jo",
        lastName: "Smith",
        password: "jo-pass-12",
      });
      expect(jo.response.status).toBe(409);
      expect(jo.response.body.message).toBe("An account with this email already exists. Please log in instead.");
    });

    it("Shared email with no matching name creates a new person", async () => {
      const sam = await db.person.create({ firstName: "Sam", lastName: "Reed", email: "fam@example.org" });
      const lee = await db.person.create({ firstName: "Lee", lastName: "Reed", email: "fam@example.org" });

      const max = await registerUser({
        email: "fam@example.org",
        firstName: "Max",
        lastName: "Reed",
        password: "max-pass-12",
      });

      expect(max.response.status).toBe(200);
      expect([sam.id, lee.id]).not.toContain(max.user.personId);
      const created = await db.person.findByPk(max.user.personId);
      expect([created.firstName, created.lastName, created.email]).toEqual(["Max", "Reed", "fam@example.org"]);
      for (const person of [sam, lee]) {
        await person.reload();
        expect(person.userId).toBeNull();
        expect(person.firstName).not.toBe("Max");
      }
    });
  });

  describe("US-80.6 — Invite people to create an account", () => {
    it("Seed adds the account invitation template", async () => {
      const seedOrg = await db.organization.create({
        name: "Health Talents International",
        email: "info@example.org",
      });

      await seedEmailTypes();
      await seedEmailTokens();
      await seedEmailTemplates();

      const type = await db.emailType.findOne({ where: { typeCode: "account-invite" } });
      expect([type.description, type.eventCode]).toEqual(["Account invitation", "team-email"]);
      const token = await db.emailToken.findOne({ where: { tokenCode: "CREATE_ACCOUNT_LINK" } });
      expect(token.valueSource).toBe("participant.createAccountLink");
      const template = await db.emailTemplate.findOne({
        where: { orgId: seedOrg.id, emailTypeId: type.id },
      });
      expect(template.functionCode).toBe("Trip Participant");
      expect(template.subject).toBe("Create your account for {{TRIP_NAME}}");
      expect(template.emailBody).toContain('<a href="{{CREATE_ACCOUNT_LINK}}">Create your account</a>');

      const counts = async () => [
        await db.emailType.count(),
        await db.emailToken.count(),
        await db.emailTemplate.count(),
      ];
      const before = await counts();
      expect(await seedEmailTypes()).toBe(0);
      expect(await seedEmailTokens()).toBe(0);
      expect((await seedEmailTemplates()).inserted).toBe(0);
      expect(await counts()).toEqual(before);
    });

    it("Email team sends the invitation with a create account link", async () => {
      await importFile(omar.authHeader);
      process.env.APP_URL = "http://localhost:8082";
      await seedEmailTypes();
      await seedEmailTokens();
      const seed = SEED_TEMPLATES.templates.find((t) => t.typeCode === "account-invite");
      const emailType = await db.emailType.findOne({ where: { typeCode: "account-invite" } });
      const template = await db.emailTemplate.create({
        orgId: org.id,
        tripId: null,
        emailTypeId: emailType.id,
        functionCode: seed.functionCode,
        fromEmail: seed.fromEmail,
        toAddress: seed.toAddress,
        subject: seed.subject,
        emailBody: seed.emailBody,
      });
      const messages = [];
      process.env.EMAIL_MODE = "smtp";
      emailTransport.create = () => ({
        sendMail: async (message) => {
          messages.push(message);
          return { messageId: `id-${messages.length}` };
        },
      });
      const lyle = await personNamed("Lyle", "Lowry");

      const send = await request(app)
        .post(`/trips/trips/${trip.id}/team-email`)
        .set(omar.authHeader)
        .send({
          emailTemplateId: template.id,
          subject: template.subject,
          emailBody: template.emailBody,
          sendTo: "selected",
          personIds: [lyle.id, tom.user.personId],
        });

      expect(send.status).toBe(200);
      expect(send.body).toMatchObject({ sent: 2, skipped: 0, failed: 0 });
      const toLyle = messages.find((m) => m.to === "lyle@example.org");
      expect(toLyle.subject).toBe("Create your account for Guatemala Clinic 2027");
      expect(toLyle.html).toContain(`<a href="${LYLE_LINK.replace(/&/g, "&amp;")}">Create your account</a>`);
      expect(toLyle.text).toContain(`Create your account (${LYLE_LINK})`);
      const toTom = messages.find((m) => m.to === "tom@example.org");
      expect(toTom.html).toContain('<a href="http://localhost:8082/">Create your account</a>');
    });
  });

  describe("US-80.7 — Travel Notes and Flight Fee select trip options", () => {
    it("Travel Notes and Flight Fee select trip options", async () => {
      await importFile(omar.authHeader);

      const lyle = await assignmentOf(await personNamed("Lyle", "Lowry"));
      expect(await selectedOptions(lyle)).toEqual(["Arrive Friday - Barceló Bar", "HTI Purchase Flights"]);
      expect(Number(lyle.participantCost)).toBe(1065);
      expect(lyle.flightPurchaseOption).toBe("organization");
      expect(await db.tripFlight.count()).toBe(0);

      const lopez = await assignmentOf(ana);
      expect(await selectedOptions(lopez)).toEqual(["Need HTI Name Tag", "Arrive Saturday"]);
      expect(Number(lopez.participantCost)).toBe(950);
      expect(lopez.flightPurchaseOption).toBeNull();

      for (const [first, last] of [
        ["Andrea", "Fletcher"],
        ["Kris", "Smith"],
      ]) {
        const assignment = await assignmentOf(await personNamed(first, last));
        expect([first, await selectedOptions(assignment), Number(assignment.participantCost)]).toEqual([
          first,
          ["Need HTI Name Tag"],
          950,
        ]);
      }
    });

    it("Options already chosen are kept", async () => {
      const applied = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: ana.id,
        roleId: (await findRole("Trip Participant")).id,
        status: "approved",
        participantCost: 1025,
      });
      await db.tripPeopleRoleOption.create({
        tripPeopleRoleId: applied.id,
        tripTravelOptionId: options.friday.id,
        selected: true,
      });

      await importFile(omar.authHeader);

      await applied.reload();
      expect(await selectedOptions(applied)).toEqual(["Need HTI Name Tag", "Arrive Friday - Barceló Bar"]);
      expect(Number(applied.participantCost)).toBe(1025);
    });
  });

  /**
   * Feature 83 — Trip Master Name Tag Option
   * Spec: features/feature-83-trip-master-name-tag-option.md
   */
  describe("Feature 83 — US-83.1 The Name Tag column selects the name tag option", () => {
    const hasNameTagOption = async (first, last) =>
      (await selectedOptions(await assignmentOf(await personNamed(first, last)))).includes("Need HTI Name Tag");

    it("Everyone without a name tag gets the name tag option", async () => {
      await importFile(omar.authHeader);

      for (const [first, last] of [
        ["Ana", "Lopez"],
        ["Kris", "Smith"],
        ["Rick", "Harper"],
        ["Andrea", "Fletcher"],
      ]) {
        expect([first, await hasNameTagOption(first, last)]).toEqual([first, true]);
      }
      const lyle = await assignmentOf(await personNamed("Lyle", "Lowry"));
      expect(await selectedOptions(lyle)).toEqual(["Arrive Friday - Barceló Bar", "HTI Purchase Flights"]);
      expect(Number(lyle.participantCost)).toBe(1065);
    });

    it("Travel Notes don't select the name tag option", async () => {
      const content = SAMPLE.toString().replace("HTI - Fri Barceló - Antigua", "HTI - Fri Barceló - Name Tag - Antigua");

      await importFile(omar.authHeader, content);

      expect(await hasNameTagOption("Lyle", "Lowry")).toBe(false);
    });

    it("A file without the column selects no name tag", async () => {
      const content = SAMPLE.toString().replace(",Do you Have a,", ",,");

      const res = await importFile(omar.authHeader, content);

      expect(res.status).toBe(200);
      expect(
        await db.tripPeopleRoleOption.count({ where: { tripTravelOptionId: options.nameTag.id, selected: true } })
      ).toBe(0);
    });
  });

  /**
   * Feature 84 — Application Flight Notes
   * Spec: features/feature-84-application-flight-notes.md
   */
  describe("Feature 84 — US-84.1 The import keeps the Trip Master's cities as flight notes", () => {
    it("Departure and arrival cities become flight notes", async () => {
      await importFile(omar.authHeader);

      const lyle = await assignmentOf(await personNamed("Lyle", "Lowry"));
      expect(lyle.flightNotes).toBe("Departure city: Dayton, OH. Arrival city: Dayton, OH.");
      const kris = await assignmentOf(await personNamed("Kris", "Smith"));
      expect(kris.flightNotes).toBeNull();

      const arrivalOnly = SAMPLE.toString().replace('"Dayton, OH","Dayton, OH"', ',"Nashville"');
      await db.tripPeopleRole.update({ flightNotes: null }, { where: { id: lyle.id } });
      await importFile(omar.authHeader, arrivalOnly);
      await lyle.reload();
      expect(lyle.flightNotes).toBe("Arrival city: Nashville.");
    });

    it("Flight notes that already have text are kept", async () => {
      const lylePerson = await db.person.create({ firstName: "Lyle", lastName: "Lowry", email: "lyle@example.org" });
      const applied = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: lylePerson.id,
        roleId: (await findRole("Trip Participant")).id,
        status: "applied",
        flightNotes: "Flying from Columbus",
      });

      await importFile(omar.authHeader);

      await applied.reload();
      expect(applied.flightNotes).toBe("Flying from Columbus");
    });
  });
});
