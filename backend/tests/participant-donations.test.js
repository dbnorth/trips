/**
 * Feature 53 — Participant Donations and Donor–Person Link
 * Spec: features/feature-53-participant-donations.md
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

describe("Feature 53 — Participant Donations and Donor–Person Link", () => {
  let admin;
  let trip;
  let ana;
  let ben;

  const register = (email, firstName, lastName, orgIds = [admin.org.id]) =>
    registerUser({ email, firstName, lastName, orgIds });

  const addAssignment = async (person, status, roleName = "Trip Participant") =>
    db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: person.user.personId,
      roleId: (await findRole(roleName)).id,
      status,
    });

  const participantDonate = (giver, recipient, amount, paymentInfo) =>
    request(app)
      .post("/trips/donations/participant")
      .set(giver.authHeader)
      .send({ tripId: trip.id, personId: recipient.user.personId, amount, paymentInfo });

  const publicDonate = (recipient, donor, authHeader = null) => {
    const req = request(app).post("/trips/public/donations");
    if (authHeader) req.set(authHeader);
    return req.send({ tripId: trip.id, personId: recipient.user.personId, amount: 40, donor });
  };

  const lookup = (caller, email) =>
    request(app).get("/trips/donors/lookup").query({ email, tripId: trip.id }).set(caller.authHeader);

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    admin = await createOrgAdminUser({ email: "admin@example.org", orgName: "Hope Mission" });
    trip = await db.trip.create({
      orgId: admin.org.id,
      name: "Guatemala Clinic",
      status: "active",
      participantCost: 1500,
    });
    ana = await register("ana@example.org", "Ana", "Lopez");
    ben = await register("ben@example.org", "Ben", "Cruz");
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-53.1 — Donate toward my own trip", () => {
    it("Approved participant donates to themselves", async () => {
      await addAssignment(ana, "approved");

      const res = await participantDonate(ana, ana, 100, "Check 1201");

      expect(res.status).toBe(200);
      const donation = await db.tripDonation.findByPk(res.body.id, {
        include: [{ model: db.donor, as: "donor" }],
      });
      expect(donation.tripId).toBe(trip.id);
      expect(donation.personId).toBe(ana.user.personId);
      expect(Number(donation.amount)).toBe(100);
      expect(donation.paymentInfo).toBe("Check 1201");
      expect(donation.donor).toMatchObject({
        personId: ana.user.personId,
        firstName: "Ana",
        lastName: "Lopez",
        email: "ana@example.org",
      });
    });

    it("A second donation reuses the linked donor", async () => {
      await addAssignment(ana, "approved");
      const linked = await db.donor.create({ firstName: "Ana", personId: ana.user.personId });

      const res = await participantDonate(ana, ana, 50);

      expect(res.status).toBe(200);
      expect(res.body.donorId).toBe(linked.id);
      expect(await db.donor.count()).toBe(1);
    });

    it("Participant not approved cannot donate to themselves", async () => {
      await addAssignment(ana, "applied");

      const res = await participantDonate(ana, ana, 100);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You can donate to yourself only on trips where you are approved.");
    });
  });

  describe("US-53.2 — Donate toward another participant", () => {
    it("Participant donates to a teammate", async () => {
      await addAssignment(ana, "applied");
      await addAssignment(ben, "approved");

      const res = await participantDonate(ana, ben, 75);

      expect(res.status).toBe(200);
      expect(res.body.personId).toBe(ben.user.personId);
      expect(Number(res.body.amount)).toBe(75);
      expect(res.body.donor.personId).toBe(ana.user.personId);
    });

    it("Recipient must be approved on the trip", async () => {
      const carl = await register("carl@example.org", "Carl", "Diaz");
      await addAssignment(ana, "approved");
      await addAssignment(carl, "applied");

      const res = await participantDonate(ana, carl, 75);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Choose a participant on this trip.");
    });

    it("Person without an application cannot donate", async () => {
      const dana = await register("dana@example.org", "Dana", "Ruiz");
      await addAssignment(ben, "approved");

      const res = await participantDonate(dana, ben, 75);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden.");
    });

    it("Amount is required", async () => {
      await addAssignment(ana, "approved");

      const res = await participantDonate(ana, ana, 0);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Donation amount is required.");
    });
  });

  describe("US-53.3 — Signed-in public donations are linked to the donor's person", () => {
    beforeEach(async () => {
      await addAssignment(ben, "approved");
    });

    it("Signed-in public donation creates a linked donor", async () => {
      const res = await publicDonate(ben, { firstName: "Ana" }, ana.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.donor.personId).toBe(ana.user.personId);
      expect(res.body.donation.donorId).toBe(res.body.donor.id);
    });

    it("Signed-in public donation uses the existing linked donor", async () => {
      const linked = await db.donor.create({ firstName: "Ana", personId: ana.user.personId });

      const res = await publicDonate(ben, { firstName: "Ana" }, ana.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.donation.donorId).toBe(linked.id);
      expect(await db.donor.count()).toBe(1);
    });

    it("Public donation without sign-in is unchanged", async () => {
      const res = await publicDonate(ben, { firstName: "Sam" });

      expect(res.status).toBe(200);
      const donor = await db.donor.findByPk(res.body.donation.donorId);
      expect(donor.firstName).toBe("Sam");
      expect(donor.personId).toBeNull();
    });
  });

  describe("US-53.4 — Staff lookup finds a person when no donor exists", () => {
    it("Lookup returns a donor first", async () => {
      const donor = await db.donor.create({ firstName: "Ana", email: "ana@example.org" });

      const res = await lookup(admin, "ana@example.org");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: donor.id, source: "donor" });
    });

    it("Lookup falls back to a person in the trip's organization", async () => {
      const res = await lookup(admin, "ana@example.org");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: null,
        personId: ana.user.personId,
        firstName: "Ana",
        lastName: "Lopez",
        email: "ana@example.org",
        source: "person",
      });
    });

    it("Lookup returns the person's linked donor", async () => {
      const linked = await db.donor.create({
        firstName: "Ana",
        email: "ana.old@example.org",
        personId: ana.user.personId,
      });

      const res = await lookup(admin, "ana@example.org");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: linked.id, source: "donor" });
    });

    it("Lookup does not return a person from another organization", async () => {
      await register("zoe@example.org", "Zoe", "Park", []);

      const res = await lookup(admin, "zoe@example.org");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Donor not found.");
    });

    it("Lookup does not return people to non-staff", async () => {
      await addAssignment(ben, "approved");

      const res = await lookup(ben, "ana@example.org");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Donor not found.");
    });

    it("Saving a donation from a person adds a linked donor", async () => {
      await addAssignment(ana, "approved");

      const res = await request(app)
        .post("/trips/donations")
        .set(admin.authHeader)
        .send({
          tripId: trip.id,
          personId: ana.user.personId,
          amount: 200,
          dateTime: "2026-10-01T17:00:00.000Z",
          donorId: null,
          donor: {
            firstName: "Ana",
            lastName: "Lopez",
            email: "ana@example.org",
            personId: ana.user.personId,
          },
        });

      expect(res.status).toBe(200);
      const linked = await db.donor.findOne({ where: { personId: ana.user.personId } });
      expect(linked).not.toBeNull();
      expect(res.body.donorId).toBe(linked.id);
    });
  });
});
