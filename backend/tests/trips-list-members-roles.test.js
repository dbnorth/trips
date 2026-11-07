/**
 * Feature 108 — Home Organization Trips Match the Trips List (Members, Total Roles, unfilled roles)
 * Spec: features/feature-108-home-trips-match-trips-list.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  registerUser,
  findRole,
} from "./helpers.js";

describe("Feature 108 — Trips list Members and Total Roles", () => {
  let olivia;
  let trip;
  let tripNurse;
  let tripDoctor;
  let addMember;

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    olivia = await createOrgAdminUser({ email: "olivia@example.org", orgName: "Hope Missions" });
    const orgId = olivia.org.id;
    trip = await db.trip.create({
      orgId,
      name: "Guatemala Clinic 2027",
      status: "active",
      startDate: "2099-06-10",
      endDate: "2099-06-17",
    });
    const nurse = await db.workerRole.create({ orgId, name: "Nurse" });
    const doctor = await db.workerRole.create({ orgId, name: "Doctor" });
    tripNurse = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: nurse.id, quantity: 4 });
    tripDoctor = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: doctor.id, quantity: 2 });

    addMember = async (email, roleName, status, tripWorkerRole = null) => {
      const reg = await registerUser({ email, firstName: email.split("@")[0], lastName: "Test", orgIds: [orgId] });
      await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: reg.user.personId,
        roleId: (await findRole(roleName)).id,
        tripWorkerRoleId: tripWorkerRole?.id ?? null,
        status,
      });
    };
    await addMember("omar@example.org", "Trip Leader", "approved");
    await addMember("ana@example.org", "Trip Participant", "approved", tripNurse);
    await addMember("ben@example.org", "Trip Participant", "pre_approved", tripNurse);
    await addMember("cara@example.org", "Trip Participant", "pre_approved", tripDoctor);
    await addMember("dev@example.org", "Trip Participant", "incomplete", tripNurse);
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const loadTrip = async () => {
    const response = await request(app).get("/trips/trips").set(olivia.authHeader);
    expect(response.status).toBe(200);
    return response.body.find((t) => t.id === trip.id);
  };

  it("Trips list counts total roles and unfilled roles", async () => {
    const row = await loadTrip();

    expect(row.activeParticipantCount).toBe(2);
    expect(row.totalRoles).toBe(6);
    expect(row.unfilledRoles).toEqual([
      { name: "Doctor", needed: 1 },
      { name: "Nurse", needed: 2 },
    ]);
  });

  it("A trip with every role filled has no unfilled roles", async () => {
    await addMember("eve@example.org", "Trip Participant", "approved", tripNurse);
    await addMember("fay@example.org", "Trip Participant", "pre_approved", tripNurse);
    await addMember("gus@example.org", "Trip Participant", "approved", tripDoctor);

    const row = await loadTrip();

    expect(row.totalRoles).toBe(6);
    expect(row.unfilledRoles).toEqual([]);
  });

  /**
   * Feature 127 — Participant Counts
   * Spec: features/feature-127-participant-counts.md
   */
  describe("Feature 127 — Participant Counts", () => {
    describe("US-127.1 — Participants column on the trips table", () => {
      it("Trips list counts active trip participants only", async () => {
        await addMember("eve@example.org", "Trip Participant", "approved", tripNurse);
        await addMember("fay@example.org", "Trip Participant", "approved", tripDoctor);
        await addMember("gus@example.org", "Trip Participant", "declined", tripNurse);
        await addMember("hal@example.org", "Trip Participant", "cancelled", tripNurse);

        const row = await loadTrip();

        expect(row.participantCount).toBe(6);
        expect(row.incompleteParticipantCount).toBe(1);
        expect(row.preApprovedParticipantCount).toBe(2);
        expect(row.approvedParticipantCount).toBe(3);
        expect(row).not.toHaveProperty("memberCount");
        expect(row).not.toHaveProperty("preApprovedMemberCount");
        expect(row.activeParticipantCount).toBe(4);
      });
    });
  });
});
