/**
 * Feature 103 — Keep Trip Roles That Have Participants
 * Spec: features/feature-103-keep-roles-with-participants.md
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
} from "./helpers.js";

/** "Guatemala Clinic 2027" with Nurse (Ana applied) and Dentist (Ben cancelled, Cara declined). */
const setup = async () => {
  const admin = await createOrgAdminUser({ email: "roles-admin@example.com", orgName: "Hope Mission" });
  const trip = await request(app)
    .post("/trips/trips")
    .set(admin.authHeader)
    .send({ orgId: admin.org.id, name: "Guatemala Clinic 2027", status: "active" });
  expect(trip.status).toBe(200);

  const addRole = async (name) => {
    const workerRole = await request(app)
      .post("/trips/worker-roles")
      .set(admin.authHeader)
      .send({ orgId: admin.org.id, name });
    const tripRole = await request(app)
      .post("/trips/trip-worker-roles")
      .set(admin.authHeader)
      .send({ tripId: trip.body.id, workerRoleId: workerRole.body.id, quantity: 2 });
    expect(tripRole.status).toBe(200);
    return tripRole.body;
  };
  const nurse = await addRole("Nurse");
  const dentist = await addRole("Dentist");

  const participantRole = await findRole("Trip Participant");
  const applicationFor = async (email, tripWorkerRoleId, status) => {
    const person = await registerUser({ email, orgIds: [admin.org.id] });
    return db.tripPeopleRole.create({
      tripId: trip.body.id,
      peopleId: person.user.personId,
      roleId: participantRole.id,
      tripWorkerRoleId,
      status,
    });
  };
  const ana = await applicationFor("ana@example.com", nurse.id, "pre_approved");
  const ben = await applicationFor("ben@example.com", dentist.id, "cancelled");
  const cara = await applicationFor("cara@example.com", dentist.id, "declined");

  return { admin, nurse, dentist, ana, ben, cara };
};

describe("Feature 103 — Keep Trip Roles That Have Participants", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-103.1 — Roles with people in them can't be removed", () => {
    it("The API refuses to delete a role with active participants", async () => {
      const { admin, nurse, ana } = await setup();

      const response = await request(app)
        .delete(`/trips/trip-worker-roles/${nurse.id}`)
        .set(admin.authHeader);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "People have signed up for this role. Move or cancel them before removing it."
      );
      expect(await db.tripWorkerRole.findByPk(nurse.id)).not.toBeNull();
      await ana.reload();
      expect(Number(ana.tripWorkerRoleId)).toBe(Number(nurse.id));
      expect(ana.status).toBe("pre_approved");
    });

    it("A role with only cancelled or declined applications can be deleted", async () => {
      const { admin, dentist, ben, cara } = await setup();

      const response = await request(app)
        .delete(`/trips/trip-worker-roles/${dentist.id}`)
        .set(admin.authHeader);

      expect(response.status).toBe(200);
      expect(await db.tripWorkerRole.findByPk(dentist.id)).toBeNull();
      await ben.reload();
      await cara.reload();
      expect(ben.tripWorkerRoleId).toBeNull();
      expect(cara.tripWorkerRoleId).toBeNull();
    });
  });
});
