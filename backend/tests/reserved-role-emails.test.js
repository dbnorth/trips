/**
 * Feature 56 — Reserved Role Emails
 * Spec: features/feature-56-reserved-role-emails.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser, createOrgAdminUser } from "./helpers.js";

describe("Feature 56 — Reserved Role Emails", () => {
  let admin;
  let trip;
  let nurse;
  let driver;

  const addRole = async (name, quantity) => {
    const workerRole = await request(app)
      .post("/trips/worker-roles")
      .set(admin.authHeader)
      .send({ orgId: admin.org.id, name, licenseRequired: false });
    expect(workerRole.status).toBe(200);
    const tripWorkerRole = await request(app)
      .post("/trips/trip-worker-roles")
      .set(admin.authHeader)
      .send({ tripId: trip.id, workerRoleId: workerRole.body.id, quantity });
    expect(tripWorkerRole.status).toBe(200);
    return tripWorkerRole.body;
  };

  const setNurseQuantity = (quantity) =>
    request(app).put(`/trips/trip-worker-roles/${nurse.id}`).set(admin.authHeader).send({ quantity });

  const reserve = (role, emails, authHeader = admin.authHeader) =>
    request(app).post(`/trips/trip-worker-roles/${role.id}/reservations`).set(authHeader).send({ emails });

  const reservations = (role) =>
    request(app).get(`/trips/trip-worker-roles/${role.id}/reservations`).set(admin.authHeader);

  const person = (firstName, lastName, email = `${firstName.toLowerCase()}@example.org`) =>
    registerUser({ email, firstName, lastName, orgIds: [admin.org.id] });

  const apply = (applicant, role) =>
    request(app)
      .post(`/trips/trips/browse/${trip.id}/apply`)
      .set(applicant.authHeader)
      .send({
        tripWorkerRoleId: role.id,
        willSelfFund: false,
        willRaiseFunds: false,
        flightPurchaseOption: "self",
      });

  /** { signedUpCount, reservedCount, availableCount } for a role from the trip-worker-role list. */
  const counts = async (role) => {
    const res = await request(app)
      .get("/trips/trip-worker-roles")
      .query({ tripId: trip.id })
      .set(admin.authHeader);
    const row = res.body.find((r) => r.id === role.id);
    return {
      signedUpCount: row.signedUpCount,
      reservedCount: row.reservedCount,
      availableCount: row.availableCount,
    };
  };

  const applicationRoleId = async (applicant) =>
    (await db.tripPeopleRole.findOne({ where: { tripId: trip.id, peopleId: applicant.user.personId } }))
      .tripWorkerRoleId;

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    admin = await createOrgAdminUser({ email: "admin@example.org", orgName: "Hope Mission" });
    const created = await request(app).post("/trips/trips").set(admin.authHeader).send({
      orgId: admin.org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: "2027-01-02",
      endDate: "2027-01-09",
      participantCost: 1500,
    });
    expect(created.status).toBe(200);
    trip = created.body;
    nurse = await addRole("Nurse", 3);
    driver = await addRole("Driver", 2);
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-56.1 — Reserve role slots by email", () => {
    it("Staff reserve emails for a role", async () => {
      const res = await reserve(nurse, ["ana@example.org", "Ben@Example.org"]);

      expect(res.status).toBe(201);
      const list = await reservations(nurse);
      expect(list.body.map(({ email, filled }) => ({ email, filled }))).toEqual([
        { email: "ana@example.org", filled: false },
        { email: "ben@example.org", filled: false },
      ]);
      expect(await counts(nurse)).toEqual({ signedUpCount: 0, reservedCount: 2, availableCount: 1 });
    });

    it("Reservations only take open slots", async () => {
      await setNurseQuantity(2);
      expect((await apply(await person("Carl", "Diaz"), nurse)).status).toBe(200);

      const res = await reserve(nurse, ["ana@example.org", "ben@example.org"]);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Only 1 open slots for this role.");
      expect(await db.tripWorkerRoleReservation.count()).toBe(0);
    });

    it("Invalid or duplicate emails are rejected", async () => {
      expect((await reserve(nurse, ["ana@example.org"])).status).toBe(201);

      const duplicate = await reserve(driver, ["ANA@example.org"]);
      expect(duplicate.status).toBe(400);
      expect(duplicate.body.message).toBe("ana@example.org is already reserved on this trip.");

      const invalid = await reserve(driver, ["not-an-email"]);
      expect(invalid.status).toBe(400);
      expect(invalid.body.message).toBe("Enter valid email addresses.");
    });

    it("Cannot reserve someone who already applied", async () => {
      expect((await apply(await person("Carl", "Diaz"), driver)).status).toBe(200);

      const res = await reserve(nurse, ["carl@example.org"]);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("carl@example.org has already applied for this trip.");
    });

    it("Staff reserve emails when adding a role", async () => {
      const newWorkerRole = async (name) =>
        (
          await request(app)
            .post("/trips/worker-roles")
            .set(admin.authHeader)
            .send({ orgId: admin.org.id, name, licenseRequired: false })
        ).body;
      const addWithEmails = async (name, quantity, emails) =>
        request(app)
          .post("/trips/trip-worker-roles")
          .set(admin.authHeader)
          .send({ tripId: trip.id, workerRoleId: (await newWorkerRole(name)).id, quantity, emails });

      const cook = await addWithEmails("Cook", 2, ["ana@example.org"]);
      expect(cook.status).toBe(200);
      expect(cook.body).toMatchObject({ signedUpCount: 0, reservedCount: 1, availableCount: 1 });
      expect((await reservations(cook.body)).body.map((r) => r.email)).toEqual(["ana@example.org"]);

      const guide = await addWithEmails("Guide", 1, ["ben@example.org", "carl@example.org"]);
      expect(guide.status).toBe(400);
      expect(guide.body.message).toBe("Only 1 open slots for this role.");
      expect(await db.tripWorkerRole.count({ where: { tripId: trip.id } })).toBe(3);
      expect(await db.tripWorkerRoleReservation.count()).toBe(1);
    });

    it("Remove a reservation", async () => {
      const [reservation] = (await reserve(nurse, ["ana@example.org"])).body;

      const res = await request(app)
        .delete(`/trips/trip-worker-roles/${nurse.id}/reservations/${reservation.id}`)
        .set(admin.authHeader);

      expect(res.status).toBe(200);
      expect(await counts(nurse)).toEqual({ signedUpCount: 0, reservedCount: 0, availableCount: 3 });
    });

    it("Number Needed cannot drop below reservations", async () => {
      await reserve(nurse, ["ana@example.org", "ben@example.org"]);

      const res = await setNurseQuantity(1);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Remove reserved emails first.");
    });

    it("Participants cannot manage reservations", async () => {
      const participant = await person("Pat", "Participant");
      expect((await apply(participant, driver)).status).toBe(200);

      const list = await request(app)
        .get(`/trips/trip-worker-roles/${nurse.id}/reservations`)
        .set(participant.authHeader);
      const add = await reserve(nurse, ["ana@example.org"], participant.authHeader);

      expect(list.status).toBe(403);
      expect(add.status).toBe(403);
    });
  });

  describe("US-56.2 — Reserved person applies into the reserved role", () => {
    it("Reserved person is placed in the reserved role", async () => {
      await setNurseQuantity(2);
      await reserve(nurse, ["Ana@Example.org"]);
      const ana = await person("Ana", "Lopez", "ana@example.org");

      const res = await apply(ana, driver);

      expect(res.status).toBe(200);
      expect(await applicationRoleId(ana)).toBe(nurse.id);
      expect(await counts(nurse)).toEqual({ signedUpCount: 1, reservedCount: 0, availableCount: 1 });
      const [row] = (await reservations(nurse)).body;
      expect(row).toMatchObject({ filled: true, applicantName: "Ana Lopez", applicationStatus: "incomplete" });
    });

    it("Reserved person can apply when no open slots remain", async () => {
      await setNurseQuantity(2);
      await reserve(nurse, ["ana@example.org"]);
      expect((await apply(await person("Ben", "Cruz"), nurse)).status).toBe(200);

      const res = await apply(await person("Ana", "Lopez"), nurse);

      expect(res.status).toBe(200);
      expect(await counts(nurse)).toEqual({ signedUpCount: 2, reservedCount: 0, availableCount: 0 });
    });

    it("Others cannot take reserved slots", async () => {
      await setNurseQuantity(2);
      await reserve(nurse, ["ana@example.org"]);
      expect((await apply(await person("Ben", "Cruz"), nurse)).status).toBe(200);

      const res = await apply(await person("Carl", "Diaz"), nurse);

      expect(res.status).toBe(400);
    });

    it("Reserved person cannot switch roles", async () => {
      await reserve(nurse, ["ana@example.org"]);
      const ana = await person("Ana", "Lopez");
      expect((await apply(ana, nurse)).status).toBe(200);

      const res = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(ana.authHeader)
        .send({ tripWorkerRoleId: driver.id, willSelfFund: false, willRaiseFunds: false, flightPurchaseOption: "self" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Your role on this trip is reserved.");
    });

    it("Cancelled reserved person returns to Reserved", async () => {
      await setNurseQuantity(2);
      await reserve(nurse, ["ana@example.org"]);
      const ana = await person("Ana", "Lopez");
      expect((await apply(ana, nurse)).status).toBe(200);
      expect((await apply(await person("Ben", "Cruz"), nurse)).status).toBe(200);

      const cancel = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/cancel`)
        .set(ana.authHeader);
      expect(cancel.status).toBe(200);
      expect(await counts(nurse)).toEqual({ signedUpCount: 1, reservedCount: 1, availableCount: 0 });

      const uncancel = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/uncancel`)
        .set(ana.authHeader);
      expect(uncancel.status).toBe(200);
      expect(await counts(nurse)).toEqual({ signedUpCount: 2, reservedCount: 0, availableCount: 0 });
    });

    it("Browse shows my reserved role", async () => {
      await reserve(nurse, ["ana@example.org"]);
      const ana = await person("Ana", "Lopez");
      const ben = await person("Ben", "Cruz");

      const anaDetail = await request(app).get(`/trips/trips/browse/${trip.id}`).set(ana.authHeader);
      const benDetail = await request(app).get(`/trips/trips/browse/${trip.id}`).set(ben.authHeader);

      expect(anaDetail.status).toBe(200);
      expect(anaDetail.body.myReservedTripWorkerRoleId).toBe(nurse.id);
      expect(benDetail.body.myReservedTripWorkerRoleId).toBeNull();
    });
  });

  describe("US-56.3 — See reserved counts", () => {
    it("Role lists include reserved counts", async () => {
      const ben = await person("Ben", "Cruz");
      expect((await apply(ben, nurse)).status).toBe(200);
      await reserve(nurse, ["ana@example.org"]);
      const expected = { signedUpCount: 1, reservedCount: 1, availableCount: 1 };
      const pick = (roles) => {
        const role = roles.find((r) => r.id === nurse.id);
        return {
          signedUpCount: role.signedUpCount,
          reservedCount: role.reservedCount,
          availableCount: role.availableCount,
        };
      };

      const browse = await request(app).get(`/trips/trips/browse/${trip.id}`).set(ben.authHeader);
      const status = await request(app).get(`/trips/trips/${trip.id}/status`).set(admin.authHeader);
      const overview = await request(app).get("/trips/public/trips/by-name/Guatemala_Clinic/overview");

      expect(await counts(nurse)).toEqual(expected);
      expect(pick(browse.body.rolesNeeded)).toEqual(expected);
      expect(pick(status.body.rolesNeeded)).toEqual(expected);
      expect(overview.status).toBe(200);
      expect(pick(overview.body.rolesNeeded)).toEqual(expected);
    });
  });
});
