/**
 * Feature 69 — Participant CSV, Roster, and Single Application Are Staff Only
 * Spec: features/feature-69-staff-only-participant-data.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  completePersonProfile,
  findRole,
} from "./helpers.js";

describe("Feature 69 — Participant CSV, Roster, and Single Application Are Staff Only", () => {
  let admin;
  let trip;
  let casey;
  let caseyAssignment;
  let teammate;
  let teammateAssignment;

  const register = (email, firstName, lastName, orgIds = [admin.org.id]) =>
    registerUser({ email, firstName, lastName, orgIds });

  const addAssignment = async (person, roleName = "Trip Participant", status = "approved") =>
    db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: person.user.personId,
      roleId: (await findRole(roleName)).id,
      status,
    });

  const createTripLeader = async () => {
    const leader = await register("leader@example.org", "Lee", "Leader");
    await addAssignment(leader, "Trip Leader");
    return leader;
  };

  const getCsv = (caller) =>
    request(app).get(`/trips/export/trips/${trip.id}/participants.csv`).set(caller.authHeader);

  const getApplication = (caller, id) => request(app).get(`/trips/trip-people-roles/${id}`).set(caller.authHeader);

  const getRoster = (caller) =>
    request(app).get("/trips/trip-people-roles").query({ tripId: trip.id }).set(caller.authHeader);

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    admin = await createOrgAdminUser({ email: "admin@example.org", orgName: "Hope Mission" });
    trip = await db.trip.create({ orgId: admin.org.id, name: "Guatemala Clinic", status: "active" });
    casey = await register("casey@example.org", "Casey", "Participant");
    await completePersonProfile(casey.user.personId, { hasAllergies: true, allergiesDescription: "Peanuts" });
    caseyAssignment = await addAssignment(casey);
    teammate = await register("terry@example.org", "Terry", "Teammate");
    teammateAssignment = await addAssignment(teammate);
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-69.1 — Only trip staff can download the participant CSV", () => {
    it("Org Admin downloads the participant CSV", async () => {
      const res = await getCsv(admin);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/csv/);
      expect(res.text).toContain("Casey");
      expect(res.text).toContain("Peanuts");
    });

    it("Trip Leader downloads the participant CSV", async () => {
      const leader = await createTripLeader();

      const res = await getCsv(leader);

      expect(res.status).toBe(200);
      expect(res.text).toContain("Casey");
    });

    it("System Admin downloads the participant CSV", async () => {
      const sysAdmin = await createSystemAdminUser();

      const res = await getCsv(sysAdmin);

      expect(res.status).toBe(200);
      expect(res.text).toContain("Casey");
    });

    it("Trip Participant is refused the participant CSV", async () => {
      const res = await getCsv(teammate);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden.");
      expect(res.text).not.toContain("Casey");
      expect(res.text).not.toContain("Peanuts");
    });

    it("User with no role on the trip is refused the participant CSV", async () => {
      const outsider = await registerUser({ email: "outsider@example.org", firstName: "Out", lastName: "Sider" });

      const res = await getCsv(outsider);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Trip not found.");
    });
  });

  describe("US-69.2 — Only trip staff can fetch a single application", () => {
    it("Trip staff get one application", async () => {
      const leader = await createTripLeader();
      const sysAdmin = await createSystemAdminUser();

      for (const caller of [admin, leader, sysAdmin]) {
        const res = await getApplication(caller, caseyAssignment.id);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(caseyAssignment.id);
        expect(res.body.person.firstName).toBe("Casey");
        expect(Array.isArray(res.body.travelOptions)).toBe(true);
      }
    });

    it("Trip Participant is refused a teammate's application", async () => {
      const res = await getApplication(teammate, caseyAssignment.id);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden.");
      expect(res.text).not.toContain("Casey");
      expect(res.text).not.toContain("Peanuts");
    });

    it("Applicant uses the browse endpoint for their own application", async () => {
      const own = await getApplication(teammate, teammateAssignment.id);
      expect(own.status).toBe(403);
      expect(own.body.message).toBe("Forbidden.");

      const browse = await request(app)
        .get(`/trips/trips/browse/${trip.id}/application`)
        .set(teammate.authHeader);
      expect(browse.status).toBe(200);
      expect(browse.body.application.id).toBe(teammateAssignment.id);
    });
  });

  describe("US-69.3 — Only trip staff can fetch the trip roster", () => {
    it("Trip staff get the trip roster", async () => {
      const leader = await createTripLeader();
      const sysAdmin = await createSystemAdminUser();

      for (const caller of [admin, leader, sysAdmin]) {
        const res = await getRoster(caller);

        expect(res.status).toBe(200);
        const row = res.body.find((r) => r.id === caseyAssignment.id);
        expect(row.person.firstName).toBe("Casey");
        expect(row.donationTotal).toBe(0);
      }
    });

    it("Trip Participant is refused the trip roster", async () => {
      const res = await getRoster(teammate);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden.");
      expect(res.text).not.toContain("Casey");
      expect(res.text).not.toContain("Peanuts");
    });

    it("Participant still donates to a teammate", async () => {
      const browse = await request(app).get(`/trips/trips/browse/${trip.id}`).set(teammate.authHeader);

      expect(browse.status).toBe(200);
      const recipient = browse.body.myTripInfo.donationRecipients.find(
        (r) => r.personId === casey.user.personId
      );
      expect(recipient).toEqual({ personId: casey.user.personId, firstName: "Casey", lastName: "Participant" });

      const donate = await request(app)
        .post("/trips/donations/participant")
        .set(teammate.authHeader)
        .send({ tripId: trip.id, personId: casey.user.personId, amount: 25 });
      expect(donate.status).toBe(200);
      expect(donate.body.personId).toBe(casey.user.personId);
    });
  });
});
