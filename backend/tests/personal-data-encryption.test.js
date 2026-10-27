/**
 * Feature 64 — Encrypt Personal and Medical Data in the Database
 * Spec: features/feature-64-encrypt-personal-data-columns.md
 */

import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import app, { logger, startServer } from "../server.js";
import db from "../app/models/index.js";
import { loadPersonalDataKey } from "../app/utils/personalDataEncryption.js";
import { readMedicalConditionIds } from "../app/utils/personMedicalConditions.js";
import { buildRoomListData } from "../app/utils/roomListPdf.js";
import { tableExists } from "../app/scripts/ensureSchema.js";
import { encryptPersonalData } from "../app/scripts/encryptPersonalData.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createOrganization,
  completePersonProfile,
  findRole,
  createDocumentType,
} from "./helpers.js";

const ENV_KEYS = [
  "PII_ENCRYPTION_KEY",
  "PII_ENCRYPTION_KEY_SECRET_ID",
  "FILE_ENCRYPTION_KEY",
  "FILE_ENCRYPTION_KEY_SECRET_ID",
  "SECRETS_AGENT_TOKEN_FILE",
];
const KEY_READ_FAILED = "Could not read the personal data encryption key.";
const DECRYPT_FAILED = "Personal data could not be decrypted.";

const PROFILE = {
  birthDate: "1985-04-12",
  addLine1: "742 Evergreen Terrace",
  addLine2: "Apt 3",
  city: "Springfield",
  state_prov: "IL",
  postalCode: "62704",
  phoneContryCode: "1",
  phoneNumber: "5550101234",
  emergencyContactName: "Marge Contact",
  emergencyContactPhoneCountryCode: "1",
  emergencyContactPhoneNumber: "5550109876",
  emergencyContactRelationship: "spouse",
  hasAllergies: true,
  allergiesDescription: "Peanuts",
  takesMedication: true,
};
const ENCRYPTED_PROFILE_COLUMNS = [
  "birthDate",
  "addLine1",
  "addLine2",
  "city",
  "state_prov",
  "postalCode",
  "phoneNumber",
  "emergencyContactName",
  "emergencyContactPhoneNumber",
  "hasAllergies",
  "allergiesDescription",
  "takesMedication",
];

const newKey = () => crypto.randomBytes(32).toString("base64");

const decryptWith = (base64Key, stored) => {
  const data = Buffer.from(stored.slice("enc1:".length), "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(base64Key, "base64"), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(data.length - 16));
  return Buffer.concat([decipher.update(data.subarray(12, data.length - 16)), decipher.final()]).toString("utf8");
};

const rawRow = async (table, id) =>
  (
    await db.sequelize.query(`SELECT * FROM \`${table}\` WHERE id = :id`, {
      replacements: { id },
      type: db.Sequelize.QueryTypes.SELECT,
    })
  )[0];

const saveProfile = async (owner, fields = PROFILE) => {
  const person = await db.person.findByPk(owner.user.personId);
  return request(app)
    .put(`/trips/people/${owner.user.personId}`)
    .set(owner.authHeader)
    .send({ ...fields, version: person.version });
};

const createLegacyLinkTable = () =>
  db.sequelize.query(`
    CREATE TABLE personMedicalConditions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      personId INT NOT NULL,
      medicalConditionId INT NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL
    )
  `);

describe("Feature 64 — Encrypt Personal and Medical Data in the Database", () => {
  let savedEnv;
  let tempDir;
  let agentCalls;
  let agentResponse;
  const originalFetch = globalThis.fetch;

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trips-pii-key-"));
    const tokenFile = path.join(tempDir, "awssmatoken");
    fs.writeFileSync(tokenFile, "agent-token\n");
    process.env.SECRETS_AGENT_TOKEN_FILE = tokenFile;

    agentCalls = [];
    agentResponse = { ok: true, status: 200, body: { SecretString: newKey() } };
    globalThis.fetch = async (url, options) => {
      agentCalls.push({ url, headers: options?.headers });
      return {
        ok: agentResponse.ok,
        status: agentResponse.status,
        json: async () => agentResponse.body,
      };
    };
  });

  afterEach(async () => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    globalThis.fetch = originalFetch;
    fs.rmSync(tempDir, { recursive: true, force: true });
    await loadPersonalDataKey();
    await db.sequelize.query("DROP TABLE IF EXISTS personMedicalConditions");
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const createTripWithRole = async (admin) => {
    const trip = await request(app).post("/trips/trips").set(admin.authHeader).send({
      orgId: admin.org.id,
      name: "Encrypted Trip",
      status: "active",
      startDate: "2027-01-10",
      endDate: "2027-01-20",
      participantCost: 1500,
    });
    const workerRole = await request(app)
      .post("/trips/worker-roles")
      .set(admin.authHeader)
      .send({ orgId: admin.org.id, name: "General Team" });
    const tripWorkerRole = await request(app)
      .post("/trips/trip-worker-roles")
      .set(admin.authHeader)
      .send({ tripId: trip.body.id, workerRoleId: workerRole.body.id, quantity: 5 });
    return { trip: trip.body, tripWorkerRole: tripWorkerRole.body };
  };

  describe("US-64.1 — Store personal and medical data encrypted in the database", () => {
    it("Profile personal and health answers are encrypted", async () => {
      const owner = await registerUser({ email: "profile@example.com" });

      const response = await saveProfile(owner);
      expect(response.status).toBe(200);

      const row = await rawRow("people", owner.user.personId);
      for (const column of ENCRYPTED_PROFILE_COLUMNS) {
        expect(row[column]).toMatch(/^enc1:/);
      }
      const stored = JSON.stringify(row);
      expect(stored).not.toContain("Peanuts");
      expect(stored).not.toContain("1985-04-12");
      expect(stored).not.toContain("5550101234");
    });

    it("Medical conditions are stored as an encrypted list", async () => {
      const admin = await createOrgAdminUser({ email: "med-list@example.com" });
      const c1 = await db.medicalCondition.create({ orgId: admin.org.id, name: "Asthma" });
      const c2 = await db.medicalCondition.create({ orgId: admin.org.id, name: "Diabetes" });

      const response = await saveProfile(admin, {
        takesMedication: true,
        medicalConditionIds: [c1.id, c2.id],
        orgId: admin.org.id,
      });
      expect(response.status).toBe(200);
      expect(response.body.medicalConditionIds).toEqual([c1.id, c2.id]);

      const row = await rawRow("people", admin.user.personId);
      expect(row.medicalConditionIds).toMatch(/^enc1:/);
      expect(await tableExists("personMedicalConditions")).toBe(false);
    });

    it("Pregnancy answers are encrypted", async () => {
      const admin = await createOrgAdminUser({ email: "preg-admin@example.com" });
      const { trip, tripWorkerRole } = await createTripWithRole(admin);
      const applicant = await registerUser({ email: "preg-app@example.com", orgIds: [admin.org.id] });
      await completePersonProfile(applicant.user.personId);

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          willRaiseFunds: false,
          flightPurchaseOption: "self",
          isPregnant: true,
          pregnancyDueDate: "2027-03-01",
        });
      expect(response.status).toBe(200);
      expect(response.body.assignment.isPregnant).toBe(true);

      const row = await rawRow("tripPeopleRoles", response.body.assignment.id);
      expect(row.isPregnant).toMatch(/^enc1:/);
      expect(row.pregnancyDueDate).toMatch(/^enc1:/);
    });

    it("Document number is encrypted", async () => {
      const owner = await registerUser({ email: "doc-number@example.com" });
      const documentType = await createDocumentType({
        type: "passport",
        description: "Passport",
        documentNumberRequired: true,
      });

      const response = await request(app)
        .post(`/trips/people/${owner.user.personId}/documents`)
        .set(owner.authHeader)
        .field("documentTypeId", String(documentType.id))
        .field("documentNumber", "X1234567")
        .field("expirationDate", "2031-06-15");
      expect(response.status).toBe(200);

      const document = await db.personDocument.findOne({ where: { personId: owner.user.personId } });
      expect(document.documentNumber).toBe("X1234567");
      const row = await rawRow("personDocuments", document.id);
      expect(row.documentNumber).toMatch(/^enc1:/);
      expect(row.documentNumber).not.toContain("X1234567");
    });

    it("Donor address and phone are encrypted", async () => {
      const admin = await createOrgAdminUser({ email: "donor-admin@example.com" });
      const trip = await db.trip.create({ orgId: admin.org.id, name: "Public Trip", status: "active" });
      const address = {
        addLine1: "1 Giving Way",
        addLine2: "Suite 2",
        city: "Austin",
        state_prov: "TX",
        postalCode: "73301",
        phoneNumber: "5550142222",
      };

      const staff = await request(app)
        .post("/trips/donors")
        .set(admin.authHeader)
        .send({ firstName: "Staff", lastName: "Donor", email: "staff.donor@example.com", ...address });
      expect(staff.status).toBe(200);
      const donation = await request(app)
        .post("/trips/public/donations")
        .send({
          tripId: trip.id,
          amount: 25,
          donor: { firstName: "Public", lastName: "Donor", email: "public.donor@example.com", ...address },
        });
      expect(donation.status).toBe(200);

      for (const [id, email] of [
        [staff.body.id, "staff.donor@example.com"],
        [donation.body.donor.id, "public.donor@example.com"],
      ]) {
        const row = await rawRow("donors", id);
        for (const column of ["addLine1", "city", "state_prov", "postalCode", "phoneNumber"]) {
          expect(row[column]).toMatch(/^enc1:/);
        }
        expect(row.email).toBe(email);
      }
    });

    it("Yes and No answers encrypt to the same length", async () => {
      const yes = await db.person.create({ firstName: "Yes", lastName: "Person", hasAllergies: true });
      const no = await db.person.create({ firstName: "No", lastName: "Person", hasAllergies: false });

      const yesRow = await rawRow("people", yes.id);
      const noRow = await rawRow("people", no.id);
      expect(yesRow.hasAllergies).toMatch(/^enc1:/);
      expect(yesRow.hasAllergies.length).toBe(noRow.hasAllergies.length);
    });
  });

  describe("US-64.2 — Everything that uses the data keeps working", () => {
    it("Profile returns the saved values", async () => {
      const owner = await registerUser({ email: "reload@example.com" });
      expect((await saveProfile(owner)).status).toBe(200);

      const response = await request(app)
        .get(`/trips/people/${owner.user.personId}`)
        .set(owner.authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(PROFILE);
    });

    it("Medical conditions are filtered by organization and removed conditions are ignored", async () => {
      const admin = await createOrgAdminUser({ email: "med-filter@example.com" });
      const otherOrg = await createOrganization("Other Org");
      const c1 = await db.medicalCondition.create({ orgId: admin.org.id, name: "Asthma" });
      const c3 = await db.medicalCondition.create({ orgId: otherOrg.id, name: "Epilepsy" });
      await saveProfile(admin, { takesMedication: true, medicalConditionIds: [c1.id], orgId: admin.org.id });
      await saveProfile(admin, { takesMedication: true, medicalConditionIds: [c3.id], orgId: otherOrg.id });
      expect(await readMedicalConditionIds(admin.user.personId)).toEqual([c1.id, c3.id]);

      await c3.destroy();

      const forOrg = await request(app)
        .get(`/trips/people/${admin.user.personId}`)
        .query({ orgId: admin.org.id })
        .set(admin.authHeader);
      expect(forOrg.status).toBe(200);
      expect(forOrg.body.medicalConditionIds).toEqual([c1.id]);

      const all = await request(app).get(`/trips/people/${admin.user.personId}`).set(admin.authHeader);
      expect(all.body.medicalConditionIds).toEqual([c1.id]);
      expect(all.body.medicalConditions).toEqual([{ id: c1.id, name: "Asthma", orgId: admin.org.id }]);
    });

    it("Saving conditions for one organization keeps the other's", async () => {
      const admin = await createOrgAdminUser({ email: "med-keep@example.com" });
      const otherOrg = await createOrganization("Keep Org");
      const c1 = await db.medicalCondition.create({ orgId: admin.org.id, name: "Asthma" });
      const c3 = await db.medicalCondition.create({ orgId: otherOrg.id, name: "Epilepsy" });
      await saveProfile(admin, { takesMedication: true, medicalConditionIds: [c1.id], orgId: admin.org.id });
      await saveProfile(admin, { takesMedication: true, medicalConditionIds: [c3.id], orgId: otherOrg.id });

      const response = await saveProfile(admin, { takesMedication: false, orgId: admin.org.id });

      expect(response.status).toBe(200);
      expect(await readMedicalConditionIds(admin.user.personId)).toEqual([c3.id]);
    });

    it("Participants CSV shows decrypted values", async () => {
      const admin = await createOrgAdminUser({ email: "csv-admin@example.com" });
      const trip = await db.trip.create({ orgId: admin.org.id, name: "CSV Trip", status: "active" });
      const participant = await db.person.create({
        firstName: "Casey",
        lastName: "Participant",
        email: "casey@example.com",
      });
      await completePersonProfile(participant.id, { hasAllergies: true, allergiesDescription: "Peanuts" });
      await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: participant.id,
        roleId: (await findRole("Trip Participant")).id,
        status: "approved",
        isPregnant: true,
        pregnancyDueDate: "2027-03-01",
      });
      expect((await rawRow("people", participant.id)).addLine1).toMatch(/^enc1:/);

      const response = await request(app)
        .get(`/trips/export/trips/${trip.id}/participants.csv`)
        .set(admin.authHeader);

      expect(response.status).toBe(200);
      for (const value of ["123 Main St", "Springfield", "62701", "1990-05-15", "Peanuts", "2027-03-01"]) {
        expect(response.text).toContain(value);
      }
    });

    it("Room list PDF shows the decrypted passport number", async () => {
      const admin = await createOrgAdminUser({ email: "room-admin@example.com" });
      const trip = await db.trip.create({ orgId: admin.org.id, name: "Room Trip", status: "active" });
      const passportType = await createDocumentType({ type: "passport", description: "Passport" });
      const person = await db.person.create({ firstName: "Ana", lastName: "Lopez", email: "ana@example.org" });
      const passport = await db.personDocument.create({
        personId: person.id,
        documentTypeId: passportType.id,
        documentNumber: "X1234567",
        expirationDate: "2031-06-15",
      });
      const assignment = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: person.id,
        roleId: (await findRole("Trip Participant")).id,
        status: "approved",
      });
      const roomingList = await db.tripRoomingList.create({ tripId: trip.id, hotelName: "Hotel" });
      const room = await db.tripRoom.create({
        tripRoomingListId: roomingList.id,
        roomNumber: "12",
        roomType: "Double",
        numberOfNights: 7,
      });
      await db.tripRoomAssignment.create({ tripRoomId: room.id, tripPeopleRoleId: assignment.id });

      const data = await buildRoomListData(trip.id);

      expect(data.rows[0].passportNumber).toBe("X1234567");
      expect((await rawRow("personDocuments", passport.id)).documentNumber).toMatch(/^enc1:/);
    });

    it("Value saved before this feature still reads", async () => {
      const owner = await registerUser({ email: "legacy@example.com" });
      await db.sequelize.query(
        "UPDATE people SET phoneNumber = '555-0100', hasAllergies = '1', birthDate = '1980-01-02' WHERE id = :id",
        { replacements: { id: owner.user.personId } }
      );

      const response = await request(app)
        .get(`/trips/people/${owner.user.personId}`)
        .set(owner.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.phoneNumber).toBe("555-0100");
      expect(response.body.hasAllergies).toBe(true);
      expect(response.body.birthDate).toBe("1980-01-02");
    });

    it("Wrong key fails without returning data", async () => {
      const owner = await registerUser({ email: "wrong-key@example.com" });
      expect((await saveProfile(owner)).status).toBe(200);

      process.env.PII_ENCRYPTION_KEY = newKey();
      await loadPersonalDataKey();
      const response = await request(app)
        .get(`/trips/people/${owner.user.personId}`)
        .set(owner.authHeader);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: DECRYPT_FAILED });
    });
  });

  describe("US-64.3 — Read the encryption key from AWS Secrets Manager", () => {
    it("Key comes from AWS Secrets Manager once", async () => {
      const envKey = newKey();
      const agentKey = agentResponse.body.SecretString;
      process.env.PII_ENCRYPTION_KEY_SECRET_ID = "PII_ENCRYPTION_KEY";
      process.env.PII_ENCRYPTION_KEY = envKey;

      await loadPersonalDataKey();
      const first = await registerUser({ email: "agent-one@example.com" });
      const second = await registerUser({ email: "agent-two@example.com" });
      expect((await saveProfile(first)).status).toBe(200);
      expect((await saveProfile(second)).status).toBe(200);
      expect((await request(app).get(`/trips/people/${second.user.personId}`).set(second.authHeader)).body.city).toBe(
        "Springfield"
      );

      expect(agentCalls).toHaveLength(1);
      expect(agentCalls[0].url).toContain("secretId=PII_ENCRYPTION_KEY");
      expect(agentCalls[0].headers["X-Aws-Parameters-Secrets-Token"]).toBe("agent-token");
      const row = await rawRow("people", first.user.personId);
      expect(decryptWith(agentKey, row.city)).toBe("Springfield");
      expect(() => decryptWith(envKey, row.city)).toThrow();
    });

    it("Env key is used when no secret is named", async () => {
      const envKey = newKey();
      process.env.PII_ENCRYPTION_KEY_SECRET_ID = "";
      process.env.PII_ENCRYPTION_KEY = envKey;

      await loadPersonalDataKey();
      const owner = await registerUser({ email: "env-key@example.com" });
      expect((await saveProfile(owner)).status).toBe(200);

      expect(agentCalls).toHaveLength(0);
      expect(decryptWith(envKey, (await rawRow("people", owner.user.personId)).city)).toBe("Springfield");
    });

    it("Document key is not used", async () => {
      process.env.PII_ENCRYPTION_KEY_SECRET_ID = "";
      process.env.PII_ENCRYPTION_KEY = "";
      process.env.FILE_ENCRYPTION_KEY = newKey();

      await expect(loadPersonalDataKey()).rejects.toThrow(KEY_READ_FAILED);
    });

    it("Startup stops when the key cannot be read", async () => {
      process.env.PII_ENCRYPTION_KEY_SECRET_ID = "PII_ENCRYPTION_KEY";
      agentResponse = { ok: false, status: 500, body: {} };
      const exits = [];
      const logged = [];
      let listened = false;
      const originalExit = process.exit;
      const originalListen = app.listen;
      const originalError = logger.error;
      process.exit = (code) => exits.push(code);
      app.listen = () => {
        listened = true;
      };
      logger.error = (message) => logged.push(message);

      try {
        await startServer();
      } finally {
        process.exit = originalExit;
        app.listen = originalListen;
        logger.error = originalError;
      }

      expect(logged).toContain(KEY_READ_FAILED);
      expect(exits).toEqual([1]);
      expect(listened).toBe(false);
    });

    it("Key of the wrong length is rejected", async () => {
      process.env.PII_ENCRYPTION_KEY_SECRET_ID = "";
      process.env.PII_ENCRYPTION_KEY = crypto.randomBytes(16).toString("base64");

      await expect(loadPersonalDataKey()).rejects.toThrow(KEY_READ_FAILED);
    });
  });

  describe("US-64.4 — Encrypt the data already in the database", () => {
    /** Rows with values written before this feature, plus old medical condition links. */
    const seedUnencrypted = async () => {
      const org = await createOrganization("Legacy Org");
      const person = await db.person.create({ firstName: "Lee", lastName: "Legacy", email: "lee@example.com" });
      const c1 = await db.medicalCondition.create({ orgId: org.id, name: "Asthma" });
      const c2 = await db.medicalCondition.create({ orgId: org.id, name: "Diabetes" });
      await db.sequelize.query(
        `UPDATE people SET birthDate = '1975-06-30', addLine1 = '9 Elm St', hasAllergies = '1',
           allergiesDescription = 'Shellfish', takesMedication = '1' WHERE id = :id`,
        { replacements: { id: person.id } }
      );
      await createLegacyLinkTable();
      await db.sequelize.query(
        `INSERT INTO personMedicalConditions (personId, medicalConditionId, createdAt, updatedAt)
         VALUES (:personId, :c1, NOW(), NOW()), (:personId, :c2, NOW(), NOW())`,
        { replacements: { personId: person.id, c1: c1.id, c2: c2.id } }
      );

      const trip = await db.trip.create({ orgId: org.id, name: "Legacy Trip", status: "active" });
      const assignment = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: person.id,
        roleId: (await findRole("Trip Participant")).id,
        status: "approved",
      });
      await db.sequelize.query(
        "UPDATE tripPeopleRoles SET isPregnant = '1', pregnancyDueDate = '2027-02-01' WHERE id = :id",
        { replacements: { id: assignment.id } }
      );
      const documentType = await createDocumentType({ type: "passport", description: "Passport" });
      const document = await db.personDocument.create({ personId: person.id, documentTypeId: documentType.id });
      await db.sequelize.query("UPDATE personDocuments SET documentNumber = 'Z7654321' WHERE id = :id", {
        replacements: { id: document.id },
      });
      const donor = await db.donor.create({ firstName: "Dana", email: "dana@example.com" });
      await db.sequelize.query("UPDATE donors SET addLine1 = '1 Donor Way', phoneNumber = '5550100' WHERE id = :id", {
        replacements: { id: donor.id },
      });

      return { person, c1, c2, assignment, document, donor };
    };

    const encryptedValues = async ({ person, assignment, document, donor }) => {
      const personRow = await rawRow("people", person.id);
      const assignmentRow = await rawRow("tripPeopleRoles", assignment.id);
      const documentRow = await rawRow("personDocuments", document.id);
      const donorRow = await rawRow("donors", donor.id);
      return [
        ...["birthDate", "addLine1", "hasAllergies", "allergiesDescription", "takesMedication", "medicalConditionIds"].map(
          (column) => personRow[column]
        ),
        assignmentRow.isPregnant,
        assignmentRow.pregnancyDueDate,
        documentRow.documentNumber,
        donorRow.addLine1,
        donorRow.phoneNumber,
      ];
    };

    it("Script encrypts existing values and moves conditions", async () => {
      const seeded = await seedUnencrypted();
      const before = (await db.person.findByPk(seeded.person.id)).toJSON();

      const counts = await encryptPersonalData();

      for (const value of await encryptedValues(seeded)) expect(value).toMatch(/^enc1:/);
      expect(await readMedicalConditionIds(seeded.person.id)).toEqual([seeded.c1.id, seeded.c2.id]);
      expect(await tableExists("personMedicalConditions")).toBe(false);
      const after = (await db.person.findByPk(seeded.person.id)).toJSON();
      expect(after).toMatchObject({
        birthDate: before.birthDate,
        addLine1: "9 Elm St",
        hasAllergies: true,
        allergiesDescription: "Shellfish",
        takesMedication: true,
      });
      const assignment = await db.tripPeopleRole.findByPk(seeded.assignment.id);
      expect(assignment.isPregnant).toBe(true);
      expect(assignment.pregnancyDueDate).toBe("2027-02-01");
      expect((await db.personDocument.findByPk(seeded.document.id)).documentNumber).toBe("Z7654321");
      expect((await db.donor.findByPk(seeded.donor.id)).addLine1).toBe("1 Donor Way");

      expect(counts["people.birthDate"]).toBe(1);
      expect(counts["donors.addLine1"]).toBe(1);
      expect(counts["personMedicalConditions moved"]).toBe(2);
      expect(Object.values(counts).every(Number.isInteger)).toBe(true);
    });

    it("Running the script twice changes nothing", async () => {
      const seeded = await seedUnencrypted();
      await encryptPersonalData();
      const afterFirst = await encryptedValues(seeded);

      const counts = await encryptPersonalData();

      expect(Object.values(counts).every((count) => count === 0)).toBe(true);
      expect(await encryptedValues(seeded)).toEqual(afterFirst);
    });

    it("Script stops without a key", async () => {
      const seeded = await seedUnencrypted();
      process.env.PII_ENCRYPTION_KEY_SECRET_ID = "";
      process.env.PII_ENCRYPTION_KEY = "";

      await expect(encryptPersonalData()).rejects.toThrow(KEY_READ_FAILED);

      expect((await rawRow("people", seeded.person.id)).addLine1).toBe("9 Elm St");
      expect((await rawRow("donors", seeded.donor.id)).addLine1).toBe("1 Donor Way");
      expect(await tableExists("personMedicalConditions")).toBe(true);
    });
  });
});
