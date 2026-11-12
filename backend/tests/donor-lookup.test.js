/**
 * Feature 131 — Donor lookup by name or email
 * Spec: features/feature-131-donor-lookup-by-name.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  registerUser,
  assignOrgRole,
} from "./helpers.js";
import { fakeStripe, saveStripeKeys } from "./stripeFake.js";

describe("Feature 131 — Donor lookup by name or email", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const setup = async () => {
    const hope = await createOrgAdminUser({ email: "lookup-admin@example.com", orgName: "Hope Mission" });
    const leader = await registerUser({
      email: "lookup-leader@example.com",
      firstName: "Lee",
      lastName: "Leader",
      orgIds: [hope.org.id],
    });
    await assignOrgRole(hope.org.id, leader.user.personId, "Trip Leader");
    const trip = await request(app).post("/trips/trips").set(hope.authHeader).send({
      orgId: hope.org.id,
      name: "Lookup Trip",
      status: "active",
      startDate: "2026-12-01",
      endDate: "2026-12-10",
      participantCost: 2000,
      leaderPeopleIds: [leader.user.personId],
    });
    expect(trip.status).toBe(200);
    const ada = await db.donor.create({
      orgId: hope.org.id,
      firstName: "Ada",
      lastName: "Smith",
      email: "ada@example.com",
      city: "Cabot",
      state_prov: "AR",
      donorType: "individual",
      status: "active",
    });
    await db.donor.create({
      orgId: hope.org.id,
      firstName: "Ben",
      lastName: "Smith",
      email: "ben@example.com",
      donorType: "individual",
      status: "active",
    });
    await db.donor.create({
      orgId: hope.org.id,
      donorType: "organization",
      organizationName: "Hope Church",
      status: "active",
    });
    await db.donor.create({
      orgId: hope.org.id,
      donorType: "individual",
      firstName: "Adam",
      lastName: "Dingwell",
      familyName: "Adam & Deb Dingwell",
      status: "active",
    });
    const other = await createOrgAdminUser({ email: "lookup-other@example.com", orgName: "Other Mission" });
    await db.donor.create({
      orgId: other.org.id,
      firstName: "Ada",
      lastName: "Other",
      email: "ada-other@example.com",
      donorType: "individual",
      status: "active",
    });
    return { hope, trip: trip.body, ada };
  };

  it("Add donation finds a donor by name or email", async () => {
    const { hope, trip } = await setup();
    const byName = await request(app)
      .get("/trips/donors/lookup")
      .query({ q: "Hope Church", tripId: trip.id })
      .set(hope.authHeader);
    expect(byName.status).toBe(200);
    expect(byName.body).toMatchObject({ organizationName: "Hope Church", donorType: "organization", source: "donor" });

    const byFamily = await request(app)
      .get("/trips/donors/lookup")
      .query({ q: "Adam & Deb", tripId: trip.id })
      .set(hope.authHeader);
    expect(byFamily.status).toBe(200);
    expect(byFamily.body).toMatchObject({ familyName: "Adam & Deb Dingwell", firstName: "Adam", lastName: "Dingwell" });

    const byEmail = await request(app)
      .get("/trips/donors/lookup")
      .query({ q: "Ada@Example.com", tripId: trip.id })
      .set(hope.authHeader);
    expect(byEmail.status).toBe(200);
    expect(byEmail.body).toMatchObject({ email: "ada@example.com", firstName: "Ada" });

    const several = await request(app)
      .get("/trips/donors/lookup")
      .query({ q: "Smith", tripId: trip.id })
      .set(hope.authHeader);
    expect(several.status).toBe(200);
    expect(several.body.matches.map((donor) => donor.firstName).sort()).toEqual(["Ada", "Ben"]);
    expect(several.body.matches.find((donor) => donor.firstName === "Ada")).toMatchObject({
      city: "Cabot",
      state_prov: "AR",
    });

    const short = await request(app)
      .get("/trips/donors/lookup")
      .query({ q: "A", tripId: trip.id })
      .set(hope.authHeader);
    expect(short.status).toBe(400);
    expect(short.body.message).toBe("Enter at least two letters of the name, or an email.");
  });

  it("The public donation page finds a donor by name without revealing contact details", async () => {
    const { hope, trip, ada } = await setup();
    const found = await request(app).get("/trips/public/donors/search").query({ tripId: trip.id, q: "ada@example.com" });
    expect(found.status).toBe(200);
    expect(found.body.matches).toEqual([{ id: ada.id, name: "Ada Smith", city: "Cabot", state: "AR" }]);
    expect(JSON.stringify(found.body)).not.toContain("ada@example.com");

    const otherName = await request(app).get("/trips/public/donors/search").query({ tripId: trip.id, q: "Ada Other" });
    expect(otherName.body.matches).toEqual([]);

    await saveStripeKeys(hope.org);
    const stripe = fakeStripe();
    const started = await request(app)
      .post("/trips/public/donations/stripe-checkout")
      .send({
        tripId: trip.id,
        amount: 50,
        paymentMethod: "card",
        donor: { id: ada.id, firstName: "Ada Smith", email: "payer@example.com" },
        returnPath: "/donate/trip/Lookup_Trip",
      });
    expect(started.status).toBe(200);
    const checkout = await db.donationCheckout.findOne({ where: { donorEmail: "payer@example.com" } });
    expect(checkout.donorId).toBe(ada.id);

    const missing = await request(app)
      .post("/trips/public/donations/stripe-checkout")
      .send({
        tripId: trip.id,
        amount: 50,
        paymentMethod: "card",
        donor: { id: 999999, firstName: "Ada", email: "payer2@example.com" },
        returnPath: "/donate/trip/Lookup_Trip",
      });
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Donor not found.");
    stripe.restore();
  });
});
