/**
 * Feature 122 — Approve Action Colors
 * Spec: features/feature-122-approve-action-colors.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  assignOrgRole,
  createDocumentType,
  findRole,
  completePersonProfile,
  COMPLETE_APPLICATION,
} from "./helpers.js";

describe("Feature 122 — Approve Action Colors", () => {
  let org;
  let lena;
  let trip;
  let nurseRoleId;
  let rnLicense;
  let passport;

  /**
   * Lena leads Hope Missions' "Guatemala Clinic", which requires a Passport; its Nurse role requires
   * an RN License.
   */
  const setup = async () => {
    const admin = await createOrgAdminUser({ email: "hope-admin@example.org", orgName: "Hope Missions" });
    org = admin.org;
    lena = await registerUser({ email: "lena@example.org", firstName: "Lena", lastName: "Ruiz", orgIds: [org.id] });
    await assignOrgRole(org.id, lena.user.personId, "Trip Leader");
    rnLicense = await createDocumentType({
      orgId: org.id,
      type: "medical_license",
      description: "RN License",
      hasExpirationDate: true,
    });
    passport = await createDocumentType({
      orgId: org.id,
      type: "passport",
      description: "Passport",
      hasExpirationDate: true,
    });
    const tripRes = await request(app)
      .post("/trips/trips")
      .set(admin.authHeader)
      .send({
        orgId: org.id,
        name: "Guatemala Clinic",
        status: "active",
        startDate: "2027-01-10",
        endDate: "2027-01-20",
        requirePassport: true,
        leaderPeopleIds: [lena.user.personId],
      });
    expect(tripRes.status).toBe(200);
    trip = tripRes.body;
    const nurse = await request(app)
      .post("/trips/worker-roles")
      .set(admin.authHeader)
      .send({ orgId: org.id, name: "Nurse", requiredDocumentTypeIds: [rnLicense.id] });
    const twr = await request(app)
      .post("/trips/trip-worker-roles")
      .set(admin.authHeader)
      .send({ tripId: trip.id, workerRoleId: nurse.body.id, quantity: 5 });
    nurseRoleId = twr.body.id;
  };

  /** A participant whose profile and application are complete unless `incomplete` is set. */
  const addParticipant = async (firstName, status, roleName = "Trip Participant", { incomplete = false } = {}) => {
    const person = await db.person.create({
      firstName,
      lastName: "Test",
      email: `${firstName.toLowerCase()}@example.org`,
    });
    if (!incomplete) await completePersonProfile(person.id);
    const assignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: person.id,
      roleId: (await findRole(roleName)).id,
      tripWorkerRoleId: roleName === "Trip Leader" ? null : nurseRoleId,
      status,
      ...(incomplete ? {} : COMPLETE_APPLICATION),
    });
    return { person, assignment };
  };

  const addDocument = (person, documentType, reviewed) =>
    db.personDocument.create({
      personId: person.id,
      documentTypeId: documentType.id,
      countryIssued: "US",
      issueDate: "2024-01-01",
      expirationDate: "2030-01-01",
      documentFileName: `people/${documentType.description}.png`,
      reviewed,
    });

  const readyToApprove = async () => {
    const res = await request(app).get(`/trips/trips/${trip.id}/status`).set(lena.authHeader);
    expect(res.status).toBe(200);
    return Object.fromEntries(res.body.participants.map((p) => [p.id, p.readyToApprove]));
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

  describe("US-122.1 — See who is approved and who is ready to approve", () => {
    it("The status endpoint says who is ready to approve", async () => {
      await setup();
      const pat = await addParticipant("Pat", "pre_approved");
      await addDocument(pat.person, passport, true);
      await addDocument(pat.person, rnLicense, true);
      const kim = await addParticipant("Kim", "pre_approved");
      await addDocument(kim.person, passport, true);
      await addDocument(kim.person, rnLicense, false);
      const ava = await addParticipant("Ava", "approved");
      await addDocument(ava.person, passport, true);
      await addDocument(ava.person, rnLicense, true);

      const ready = await readyToApprove();

      expect(ready[pat.assignment.id]).toBe(true);
      expect(ready[kim.assignment.id]).toBe(false);
      expect(ready[ava.assignment.id]).toBe(false);
    });

    it("Marking the last document Reviewed makes the application ready", async () => {
      await setup();
      const kim = await addParticipant("Kim", "pre_approved");
      await addDocument(kim.person, passport, true);
      const license = await addDocument(kim.person, rnLicense, false);
      expect((await readyToApprove())[kim.assignment.id]).toBe(false);

      const reviewed = await request(app)
        .put(`/trips/trip-people-roles/${kim.assignment.id}/documents/${license.id}/reviewed`)
        .set(lena.authHeader)
        .send({ reviewed: true });
      expect(reviewed.status).toBe(200);

      expect((await readyToApprove())[kim.assignment.id]).toBe(true);
    });

    it("Trip Leader rows need no documents to be ready", async () => {
      await setup();
      const ray = await addParticipant("Ray", "pre_approved", "Trip Leader");

      expect((await readyToApprove())[ray.assignment.id]).toBe(true);
    });
  });

  describe("US-122.2 — Only the trip's documents count for approval", () => {
    it("A profile document the trip doesn't require doesn't block approval", async () => {
      await setup();
      const pat = await addParticipant("Pat", "pre_approved");
      await addDocument(pat.person, passport, true);
      await addDocument(pat.person, rnLicense, true);
      const backgroundCheck = await createDocumentType({
        orgId: org.id,
        type: "certification",
        description: "Background check",
        hasExpirationDate: false,
      });
      await db.personDocument.create({
        personId: pat.person.id,
        documentTypeId: backgroundCheck.id,
        countryIssued: "US",
        documentFileName: null,
      });

      const review = await request(app)
        .get(`/trips/trip-people-roles/${pat.assignment.id}/document-review`)
        .set(lena.authHeader);
      expect(review.body.approvalBlockers).toEqual([]);
      expect((await readyToApprove())[pat.assignment.id]).toBe(true);
      const status = await request(app).get(`/trips/trips/${trip.id}/status`).set(lena.authHeader);
      const missing = status.body.participants.find((p) => p.id === pat.assignment.id).missingItems;
      expect(missing.join(" ")).not.toContain("every profile document");

      const approved = await request(app)
        .put(`/trips/trip-people-roles/${pat.assignment.id}`)
        .set(lena.authHeader)
        .send({ status: "approved", version: pat.assignment.version });
      expect(approved.status).toBe(200);
      expect((await db.tripPeopleRole.findByPk(pat.assignment.id)).status).toBe("approved");
    });
  });

  describe("US-122.3 — Approval needs a complete profile and application", () => {
    it("Document review lists missing profile and application items", async () => {
      await setup();
      const sam = await addParticipant("Sam", "pre_approved", "Trip Participant", { incomplete: true });
      await completePersonProfile(sam.person.id, { emergencyContactRelationship: null });
      await sam.assignment.update({ ...COMPLETE_APPLICATION, willSelfFund: false });
      await addDocument(sam.person, passport, true);
      await addDocument(sam.person, rnLicense, true);

      const review = await request(app)
        .get(`/trips/trip-people-roles/${sam.assignment.id}/document-review`)
        .set(lena.authHeader);

      expect(review.status).toBe(200);
      expect(review.body.profileMissing).toEqual(["Emergency contact relationship"]);
      expect(review.body.applicationMissing).toEqual(["Funding (self-fund and/or raise funds)"]);
      expect(review.body.approvalBlockers).toEqual([]);
    });

    it("An incomplete profile or application blocks approval and the orange color", async () => {
      await setup();
      const sam = await addParticipant("Sam", "pre_approved", "Trip Participant", { incomplete: true });
      await addDocument(sam.person, passport, true);
      await addDocument(sam.person, rnLicense, true);

      expect((await readyToApprove())[sam.assignment.id]).toBe(false);
      const refused = await request(app)
        .put(`/trips/trip-people-roles/${sam.assignment.id}`)
        .set(lena.authHeader)
        .send({ status: "approved", version: sam.assignment.version });
      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe("Complete the profile and application before approving.");
      expect((await db.tripPeopleRole.findByPk(sam.assignment.id)).status).toBe("pre_approved");
    });

    it("Trip Leader rows are approved without the checklist", async () => {
      await setup();
      const ray = await addParticipant("Ray", "pre_approved", "Trip Leader", { incomplete: true });

      const review = await request(app)
        .get(`/trips/trip-people-roles/${ray.assignment.id}/document-review`)
        .set(lena.authHeader);
      expect(review.body.profileMissing).toEqual([]);
      expect(review.body.applicationMissing).toEqual([]);
      const approved = await request(app)
        .put(`/trips/trip-people-roles/${ray.assignment.id}`)
        .set(lena.authHeader)
        .send({ status: "approved", version: ray.assignment.version });
      expect(approved.status).toBe(200);
    });
  });

  describe("US-122.4 — Override the approval checks", () => {
    it("Override Approve approves an application with missing items", async () => {
      await setup();
      const sam = await addParticipant("Sam", "pre_approved", "Trip Participant", { incomplete: true });

      const approved = await request(app)
        .put(`/trips/trip-people-roles/${sam.assignment.id}`)
        .set(lena.authHeader)
        .send({ status: "approved", version: sam.assignment.version, overrideApprovalChecks: true });

      expect(approved.status).toBe(200);
      expect((await db.tripPeopleRole.findByPk(sam.assignment.id)).status).toBe("approved");
    });
  });
});
