/**
 * Feature 115 — Document Expiration Check
 * Spec: features/feature-115-document-expiration-check.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
  completePersonProfile,
  createDocumentType,
} from "./helpers.js";

const addDays = (ymd, days) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const mmddyyyy = (ymd) => {
  const [y, m, d] = ymd.split("-");
  return `${m}/${d}/${y}`;
};

const START = addDays(today(), 120);
const END = addDays(START, 7);
const CHECK = addDays(END, 90);

describe("Feature 115 — Document Expiration Check", () => {
  let olivia;
  let org;
  let maria;
  let rnLicense;
  let passport;
  let trip;
  let assignment;

  /**
   * Hope Missions runs Guatemala Clinic (requires a passport); its Nurse role requires an RN License.
   * Maria has a complete profile and a pre-approved application as Nurse.
   */
  const setup = async ({ rnCheck = "trip_end", passportCheck = "trip_end", isPregnant = false } = {}) => {
    olivia = await createOrgAdminUser({ email: "olivia@example.org", orgName: "Hope Missions" });
    org = olivia.org;
    maria = await registerUser({ email: "maria@example.org", firstName: "Maria", lastName: "Lopez", orgIds: [org.id] });
    await completePersonProfile(maria.user.personId);
    rnLicense = await createDocumentType({
      orgId: org.id,
      type: "medical_license",
      description: "RN License",
      hasExpirationDate: true,
      expirationCheck: rnCheck,
    });
    passport = await createDocumentType({
      orgId: org.id,
      type: "passport",
      description: "Passport",
      hasExpirationDate: true,
      expirationCheck: passportCheck,
    });
    const nurse = await db.workerRole.create({ orgId: org.id, name: "Nurse" });
    await db.workerRoleDocumentType.create({ workerRoleId: nurse.id, documentTypeId: rnLicense.id });
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: START,
      endDate: END,
      participantCost: 1800,
      requirePassport: true,
    });
    const tripWorkerRole = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: nurse.id, quantity: 2 });
    assignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: maria.user.personId,
      roleId: (await findRole("Trip Participant")).id,
      tripWorkerRoleId: tripWorkerRole.id,
      status: "pre_approved",
      isPregnant,
    });
  };

  const addDocument = (documentType, expirationDate, fields = {}) =>
    db.personDocument.create({
      personId: maria.user.personId,
      documentTypeId: documentType.id,
      countryIssued: "US",
      expirationDate,
      documentFileName: `people/${documentType.type}.png`,
      ...fields,
    });

  const missingDocuments = async () => {
    const res = await request(app).get("/trips/trips/browse/mine").query({ orgId: org.id }).set(maria.authHeader);
    expect(res.status).toBe(200);
    const [action] = res.body.find((t) => Number(t.id) === Number(trip.id)).nextActions;
    expect(action.code).toBe("upload-documents");
    return action.missingDocuments;
  };

  const tripDocuments = async () => {
    const res = await request(app).get("/trips/trips/browse/mine/documents").set(maria.authHeader);
    expect(res.status).toBe(200);
    return Object.fromEntries(res.body[0].documents.map((doc) => [doc.name, doc.uploaded]));
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-115.1 — Choose how a document's expiration is checked", () => {
    it("Expiration check saved", async () => {
      await setup();

      const update = await request(app)
        .put(`/trips/document-types/${rnLicense.id}`)
        .set(olivia.authHeader)
        .send({ expirationCheck: "trip_end_90" });
      expect(update.status).toBe(200);
      expect(update.body.expirationCheck).toBe("trip_end_90");

      const onOrAfter = await request(app)
        .put(`/trips/document-types/${rnLicense.id}`)
        .set(olivia.authHeader)
        .send({ expirationCheck: "trip_end_on_or_after" });
      expect(onOrAfter.status).toBe(200);
      expect(onOrAfter.body.expirationCheck).toBe("trip_end_on_or_after");

      const invalid = await request(app)
        .put(`/trips/document-types/${rnLicense.id}`)
        .set(olivia.authHeader)
        .send({ expirationCheck: "next_year" });
      expect(invalid.status).toBe(400);
      expect(invalid.body.message).toBe(
        "Expiration check must be trip_end, trip_end_on_or_after, trip_end_90, or trip_end_180."
      );
      await rnLicense.reload();
      expect(rnLicense.expirationCheck).toBe("trip_end_on_or_after");

      const longest = await request(app)
        .put(`/trips/document-types/${rnLicense.id}`)
        .set(olivia.authHeader)
        .send({ expirationCheck: "trip_end_180" });
      expect(longest.status).toBe(200);
      expect(longest.body.expirationCheck).toBe("trip_end_180");
    });

    it("Existing and no-expiration types use after trip end date", async () => {
      await setup();
      const existing = await db.documentType.create({ orgId: org.id, type: "certification", description: "CPR" });

      const noExpiration = await request(app)
        .post("/trips/document-types")
        .set(olivia.authHeader)
        .send({
          orgId: org.id,
          type: "diploma",
          description: "Diploma",
          hasExpirationDate: false,
          expirationCheck: "trip_end_90",
        });

      expect(noExpiration.status).toBe(200);
      expect(noExpiration.body.expirationCheck).toBe("trip_end");
      await existing.reload();
      expect(existing.expirationCheck).toBe("trip_end");
    });
  });

  describe("US-115.2 — See the expiration check in missing document messages", () => {
    it("Document expiring too soon after the trip is missing", async () => {
      await setup({ rnCheck: "trip_end_90" });
      await addDocument(passport, "2035-01-01");
      const tooSoon = addDays(END, 40);
      await addDocument(rnLicense, tooSoon);

      expect(await missingDocuments()).toEqual([
        `RN License: the expiration date ${mmddyyyy(tooSoon)} must be after ${mmddyyyy(CHECK)} (90 days after the trip ends)`,
      ]);
    });

    it("No document names the 90-day rule", async () => {
      await setup({ rnCheck: "trip_end_90" });
      await addDocument(passport, "2035-01-01");

      expect(await missingDocuments()).toEqual([
        `RN License: add this document with an expiration date after ${mmddyyyy(CHECK)} (90 days after the trip ends)`,
      ]);
    });

    it("Document late enough meets the 90-day check", async () => {
      await setup({ rnCheck: "trip_end_90" });
      const license = await addDocument(rnLicense, CHECK);

      expect((await tripDocuments())["RN License"]).toBe(false);

      await license.update({ expirationDate: addDays(CHECK, 1) });
      expect((await tripDocuments())["RN License"]).toBe(true);
    });

    it("180 days after trip end date uses trip end plus 180 days", async () => {
      await setup({ rnCheck: "trip_end_180" });
      await addDocument(passport, "2035-01-01");
      const check180 = addDays(END, 180);
      const license = await addDocument(rnLicense, check180);

      expect(await missingDocuments()).toEqual([
        `RN License: the expiration date ${mmddyyyy(check180)} must be after ${mmddyyyy(check180)} (180 days after the trip ends)`,
      ]);

      await license.update({ expirationDate: addDays(check180, 1) });
      expect((await tripDocuments())["RN License"]).toBe(true);
    });

    it("After trip end date is unchanged", async () => {
      await setup({ rnCheck: "trip_end" });
      await addDocument(rnLicense, addDays(END, 40));
      await addDocument(passport, END);

      const documents = await tripDocuments();
      expect(documents["RN License"]).toBe(true);
      expect(documents.Passport).toBe(false);
    });

    it("On or after trip end date accepts the trip end date", async () => {
      await setup({ rnCheck: "trip_end_on_or_after" });
      await addDocument(passport, "2035-01-01");
      const dayBefore = addDays(END, -1);
      const license = await addDocument(rnLicense, dayBefore);

      expect(await missingDocuments()).toEqual([
        `RN License: the expiration date ${mmddyyyy(dayBefore)} must be on or after ${mmddyyyy(END)}`,
      ]);

      await license.update({ expirationDate: END });
      expect((await tripDocuments())["RN License"]).toBe(true);
    });

    it("Passport type's check applies to the trip passport", async () => {
      await setup({ passportCheck: "trip_end_90" });
      await addDocument(passport, addDays(END, 38));

      expect((await tripDocuments()).Passport).toBe(false);
    });

    it("Trip page missing items use the check", async () => {
      await setup({ rnCheck: "trip_end_90" });
      await addDocument(rnLicense, addDays(END, 40));

      const status = await request(app).get(`/trips/trips/${trip.id}/status`).set(olivia.authHeader);

      expect(status.status).toBe(200);
      const row = status.body.participants.find((p) => Number(p.peopleId) === Number(maria.user.personId));
      expect(row.missingItems).toContain("Required role document(s): RN License");
    });

    it("Doctor Permission uses its check", async () => {
      await setup({ isPregnant: true });
      const doctorPermission = await createDocumentType({
        orgId: org.id,
        type: "doctor_permission",
        description: "Doctor Permission",
        hasExpirationDate: true,
        expirationCheck: "trip_end_90",
      });
      await addDocument(rnLicense, "2035-01-01");
      await addDocument(passport, "2035-01-01");
      await addDocument(doctorPermission, addDays(END, 60));

      expect(await missingDocuments()).toEqual(["Doctor Permission"]);
    });

    it("Doctor Permission on after trip end date rejects the trip end date", async () => {
      await setup({ isPregnant: true });
      const doctorPermission = await createDocumentType({
        orgId: org.id,
        type: "doctor_permission",
        description: "Doctor Permission",
        hasExpirationDate: true,
        expirationCheck: "trip_end",
      });
      await addDocument(rnLicense, "2035-01-01");
      await addDocument(passport, "2035-01-01");
      await addDocument(doctorPermission, END);

      expect(await missingDocuments()).toEqual(["Doctor Permission"]);

      await doctorPermission.update({ expirationCheck: "trip_end_on_or_after" });
      const res = await request(app).get("/trips/trips/browse/mine").query({ orgId: org.id }).set(maria.authHeader);
      const [action] = res.body.find((t) => Number(t.id) === Number(trip.id)).nextActions;
      expect(action?.code).not.toBe("upload-documents");
    });
  });

  describe("US-115.3 — Approve only when documents meet the expiration check", () => {
    it("Approval blocked by the 90-day check", async () => {
      await setup({ rnCheck: "trip_end_90" });
      await addDocument(rnLicense, addDays(END, 40), { reviewed: true });
      await addDocument(passport, "2030-01-01", { reviewed: true });

      const review = await request(app)
        .get(`/trips/trip-people-roles/${assignment.id}/document-review`)
        .set(olivia.authHeader);
      expect(review.status).toBe(200);
      expect(review.body.approvalBlockers).toEqual(["RN License: not uploaded"]);

      await assignment.reload();
      const approve = await request(app)
        .put(`/trips/trip-people-roles/${assignment.id}`)
        .set(olivia.authHeader)
        .send({ status: "approved", version: assignment.version });
      expect(approve.status).toBe(400);
    });
  });
});
