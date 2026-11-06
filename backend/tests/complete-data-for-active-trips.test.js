/**
 * Feature 121 — Complete Data for Active Trips
 * Spec: features/feature-121-complete-data-for-active-trips.md
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
  completePersonProfile,
} from "./helpers.js";

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const PROFILE_MESSAGE = "This profile is on an active trip and can't be saved with missing information.";

describe("Feature 121 — Complete Data for Active Trips", () => {
  let admin;
  let lena;
  let pat;
  let trip;
  let nurse;
  let assignmentId;

  const application = (overrides = {}) => ({
    tripWorkerRoleId: nurse.id,
    willSelfFund: true,
    willRaiseFunds: false,
    flightPurchaseOption: "self",
    hasPreferredRoommate: false,
    isPregnant: false,
    // Leftover agreement files in AGREEMENTS_DIR can make the agreement required for this org id.
    agreementAccepted: true,
    agreementSignatureName: "Pat Lee",
    ...overrides,
  });

  /**
   * Lena Ruiz leads "Guatemala Clinic" (Hope Missions; requires a Passport). Pat Lee applied as Nurse
   * with a complete profile and application, so her application is Pre-Approved.
   */
  const setup = async () => {
    admin = await createOrgAdminUser({ email: "hope-admin@example.org", orgName: "Hope Missions" });
    lena = await registerUser({ email: "lena@example.org", firstName: "Lena", lastName: "Ruiz", orgIds: [admin.org.id] });
    await assignOrgRole(admin.org.id, lena.user.personId, "Trip Leader");
    await completePersonProfile(lena.user.personId);
    const tripRes = await request(app)
      .post("/trips/trips")
      .set(admin.authHeader)
      .send({
        orgId: admin.org.id,
        name: "Guatemala Clinic",
        status: "active",
        startDate: dateFromToday(60),
        endDate: dateFromToday(70),
        participantCost: 1800,
        requirePassport: true,
        leaderPeopleIds: [lena.user.personId],
      });
    expect(tripRes.status).toBe(200);
    trip = tripRes.body;
    const role = await request(app)
      .post("/trips/worker-roles")
      .set(admin.authHeader)
      .send({ orgId: admin.org.id, name: "Nurse" });
    nurse = (
      await request(app)
        .post("/trips/trip-worker-roles")
        .set(admin.authHeader)
        .send({ tripId: trip.id, workerRoleId: role.body.id, quantity: 2 })
    ).body;
    pat = await registerUser({ email: "pat@example.org", firstName: "Pat", lastName: "Lee", orgIds: [admin.org.id] });
    await completePersonProfile(pat.user.personId);
    const applied = await request(app)
      .post(`/trips/trips/browse/${trip.id}/apply`)
      .set(pat.authHeader)
      .send(application());
    expect(applied.status).toBe(200);
    assignmentId = applied.body.assignment.id;
    expect((await db.tripPeopleRole.findByPk(assignmentId)).status).toBe("pre_approved");
  };

  const setStatus = (status) => db.tripPeopleRole.update({ status }, { where: { id: assignmentId } });

  const saveProfile = (user, personId, fields) =>
    request(app).put(`/trips/people/${personId}`).set(user.authHeader).send(fields);

  const saveApplication = (fields) =>
    request(app).put(`/trips/trips/browse/${trip.id}/application`).set(pat.authHeader).send(application(fields));

  const storedPerson = (personId) => db.person.findByPk(personId);

  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-121.1 — My profile stays complete while I'm on a trip", () => {
    it("Profile with missing information is refused while on an active trip", async () => {
      await setup();

      const res = await saveProfile(pat, pat.user.personId, { phoneNumber: "", city: "Peoria" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: `${PROFILE_MESSAGE} Missing: Phone number.`,
        missingItems: ["Phone number"],
      });
      const person = await storedPerson(pat.user.personId);
      expect(person.phoneNumber).toBe("5551234567");
      expect(person.city).toBe("Springfield");
    });

    it("A complete profile saves as usual on an active trip", async () => {
      await setup();
      await setStatus("approved");

      const res = await saveProfile(pat, pat.user.personId, { city: "Peoria" });

      expect(res.status).toBe(200);
      expect((await storedPerson(pat.user.personId)).city).toBe("Peoria");
    });

    it("The lock ends after the trip end date", async () => {
      await setup();
      await setStatus("approved");
      await db.trip.update(
        { startDate: dateFromToday(-10), endDate: dateFromToday(-1) },
        { where: { id: trip.id } }
      );

      const res = await saveProfile(pat, pat.user.personId, { phoneNumber: "" });

      expect(res.status).toBe(200);
    });

    it("Incomplete or cancelled applications don't lock the profile", async () => {
      await setup();
      for (const status of ["incomplete", "cancelled"]) {
        await setStatus(status);
        await completePersonProfile(pat.user.personId);

        const res = await saveProfile(pat, pat.user.personId, { phoneNumber: "" });

        expect(res.status).toBe(200);
      }
    });

    it("Trip Leaders are locked too", async () => {
      await setup();

      const res = await saveProfile(lena, lena.user.personId, { emergencyContactName: "" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(`${PROFILE_MESSAGE} Missing: Emergency contact name.`);
    });

    it("Missing documents don't block saving", async () => {
      await setup();

      expect((await saveProfile(pat, pat.user.personId, { city: "Peoria" })).status).toBe(200);
      const saved = await saveApplication({ hasPreferredRoommate: true, preferredRoommateNames: "Ana Lopez" });
      expect(saved.status).toBe(200);
      expect(saved.body.applicationStatus).toBe("pre_approved");
    });
  });

  describe("US-121.2 — My Pre-Approved application stays complete", () => {
    it("A Pre-Approved application with a missing answer can't be saved", async () => {
      await setup();

      const res = await saveApplication({ willSelfFund: false, willRaiseFunds: false });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message:
          "This Pre-Approved application can't be saved with missing information. Missing: Funding (self-fund and/or raise funds).",
        missingItems: ["Funding (self-fund and/or raise funds)"],
      });
      const row = await db.tripPeopleRole.findByPk(assignmentId);
      expect(row.status).toBe("pre_approved");
      expect(row.willSelfFund).toBe(true);
    });

    it("A complete Pre-Approved application saves as usual", async () => {
      await setup();

      const res = await saveApplication({ hasPreferredRoommate: true, preferredRoommateNames: "Ana Lopez" });

      expect(res.status).toBe(200);
      const row = await db.tripPeopleRole.findByPk(assignmentId);
      expect(row.status).toBe("pre_approved");
      expect(row.preferredRoommateNames).toBe("Ana Lopez");
    });
  });

  describe("US-121.3 — Staff edits keep accepted data complete", () => {
    it("Staff can't save a profile with missing information", async () => {
      await setup();

      const res = await saveProfile(admin, pat.user.personId, { emergencyContactName: "" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(`${PROFILE_MESSAGE} Missing: Emergency contact name.`);
      expect((await storedPerson(pat.user.personId)).emergencyContactName).toBe("Sam Contact");
    });

    it("Staff can't clear the trip role of an accepted participant", async () => {
      await setup();
      await setStatus("approved");

      const res = await request(app)
        .put(`/trips/trip-people-roles/${assignmentId}`)
        .set(lena.authHeader)
        .send({ tripWorkerRoleId: null, status: "approved" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Trip role is required while the application is Pre-Approved or Approved on an active trip."
      );
      expect((await db.tripPeopleRole.findByPk(assignmentId)).tripWorkerRoleId).toBe(nurse.id);

      const declined = await request(app)
        .put(`/trips/trip-people-roles/${assignmentId}`)
        .set(lena.authHeader)
        .send({ tripWorkerRoleId: null, status: "declined" });
      expect(declined.status).toBe(200);
    });
  });
});
