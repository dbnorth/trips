/**
 * Feature 119 — My Trip Page
 * Spec: features/feature-119-my-trip-page.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser, createOrganization, findRole } from "./helpers.js";
import { fakeStripe, payWithStripe, saveStripeKeys } from "./stripeFake.js";

describe("Feature 119 — My Trip Page", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-119.2 — See my trip's money in one place", () => {
    it("Browse detail includes the cost breakdown and balance", async () => {
      const org = await createOrganization("Hope Missions");
      const pat = await registerUser({ email: "pat@example.org", firstName: "Pat", lastName: "Lee", orgIds: [org.id] });
      const trip = await db.trip.create({
        orgId: org.id,
        name: "Guatemala Clinic",
        status: "active",
        participantCost: 1500,
      });
      const assignment = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: pat.user.personId,
        roleId: (await findRole("Trip Participant")).id,
        status: "approved",
        participantCost: 1700,
        flightPurchaseOption: "organization",
      });
      const privateRoom = await db.tripTravelOption.create({
        tripId: trip.id,
        description: "Private room",
        priceAdjustment: 200,
        setNumber: 1,
      });
      await db.tripPeopleRoleOption.create({
        tripPeopleRoleId: assignment.id,
        tripTravelOptionId: privateRoom.id,
        selected: true,
      });
      await db.tripPeopleRoleExpense.create({ tripPeopleRoleId: assignment.id, description: "Travel insurance", cost: 75 });
      await db.tripFlight.create({ tripPeopleRoleId: assignment.id, cost: 650 });
      await db.tripDonation.create({ tripId: trip.id, personId: pat.user.personId, amount: 1000 });

      const res = await request(app).get(`/trips/trips/browse/${trip.id}`).set(pat.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.myTripInfo.costBreakdown).toEqual({
        tripCost: 1500,
        tripOptions: [{ description: "Private room", amount: 200 }],
        adjustment: 0,
        addonExpenses: [{ description: "Travel insurance", amount: 75 }],
        airfare: 650,
        totalTripCost: 2425,
      });
      expect(res.body.myTripInfo.amountOwed).toBe(1425);
    });

    it("Pre-Approved participants can give and receive donations", async () => {
      const org = await createOrganization("Hope Missions");
      const pat = await registerUser({ email: "pat@example.org", firstName: "Pat", lastName: "Lee", orgIds: [org.id] });
      const trip = await db.trip.create({
        orgId: org.id,
        name: "Guatemala Clinic",
        status: "active",
        startDate: "2099-01-10",
        endDate: "2099-01-20",
        participantCost: 1425,
      });
      const assignment = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: pat.user.personId,
        roleId: (await findRole("Trip Participant")).id,
        status: "pre_approved",
        flightPurchaseOption: "organization",
      });

      await saveStripeKeys(org);
      const stripe = fakeStripe();
      const donate = () =>
        payWithStripe(stripe, {
          path: "/trips/donations/participant/stripe-checkout",
          authHeader: pat.authHeader,
          body: { tripId: trip.id, personId: pat.user.personId, amount: 50 },
        });

      try {
        expect((await donate()).start.status).toBe(200);
      } finally {
        stripe.restore();
      }

      const browse = await request(app).get(`/trips/trips/browse/${trip.id}`).set(pat.authHeader);
      expect(browse.body.myTripInfo.donationRecipients.map((r) => r.personId)).toEqual([pat.user.personId]);
      const actions = browse.body.myTripInfo.nextActions;
      expect(actions[0].code).toMatch(/^(upload-documents|wait-approval)$/);
      expect(actions.slice(1)).toEqual([{ code: "make-donation", amountOwed: 1375 }]);

      const publicTrip = await request(app).get(`/trips/public/trips/${trip.id}`);
      expect(publicTrip.body.participants.map((p) => p.person.id)).toEqual([pat.user.personId]);
      const publicPat = await request(app).get(`/trips/public/trips/${trip.id}/participants/${pat.user.personId}`);
      expect(publicPat.status).toBe(200);

      await assignment.update({ status: "incomplete" });
      const refused = await request(app)
        .post("/trips/donations/participant/stripe-checkout")
        .set(pat.authHeader)
        .send({ tripId: trip.id, personId: pat.user.personId, amount: 50, paymentMethod: "card" });
      expect(refused.status).toBe(403);
      expect(refused.body.message).toBe(
        "You can donate to yourself only on trips where you are pre-approved or approved."
      );
    });
  });

  describe("US-119.3 — See my room and flights, or know they aren't ready", () => {
    it("Adjusted arrive and depart dates show what moved them", async () => {
      const org = await createOrganization("Hope Missions");
      const pat = await registerUser({ email: "pat@example.org", firstName: "Pat", lastName: "Lee", orgIds: [org.id] });
      const trip = await db.trip.create({
        orgId: org.id,
        name: "Guatemala Clinic",
        status: "active",
        startDate: "2027-01-10",
        endDate: "2027-01-20",
      });
      const assignment = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: pat.user.personId,
        roleId: (await findRole("Trip Participant")).id,
        status: "approved",
      });
      const arriveEarly = await db.tripTravelOption.create({
        tripId: trip.id,
        description: "Arrive early",
        priceAdjustment: 0,
        setNumber: 1,
        daysBefore: 2,
      });
      await db.tripPeopleRoleOption.create({
        tripPeopleRoleId: assignment.id,
        tripTravelOptionId: arriveEarly.id,
        selected: true,
      });
      await db.tripPeopleRoleExpense.create({
        tripPeopleRoleId: assignment.id,
        description: "Extra hotel night",
        cost: 80,
        daysBefore: 1,
        daysAfter: 1,
      });

      const res = await request(app).get(`/trips/trips/browse/${trip.id}`).set(pat.authHeader);

      expect(res.status).toBe(200);
      const info = res.body.myTripInfo;
      expect(info.arrivalDate).toBe("2027-01-07");
      expect(info.departureDate).toBe("2027-01-21");
      expect(info.arrivalAdjustments).toEqual([
        { type: "option", description: "Arrive early", days: 2 },
        { type: "addon", description: "Extra hotel night", days: 1 },
      ]);
      expect(info.departureAdjustments).toEqual([{ type: "addon", description: "Extra hotel night", days: 1 }]);
    });
  });
});
