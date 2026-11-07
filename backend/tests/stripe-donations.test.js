/**
 * Feature 100 — Online Donations with Stripe, Donation Types, Trip Donation Email, and Donation Date Range
 * Spec: features/feature-100-stripe-donations.md
 */

import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import { ensureSchema } from "../app/scripts/ensureSchema.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { runStripeChecks } from "../app/utils/stripeDonations.js";
import { decryptText } from "../app/utils/personalDataEncryption.js";
import { STRIPE_API_VERSION, STRIPE_FEE_COVERAGE_API_VERSION } from "../app/utils/stripeClient.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  findRole,
} from "./helpers.js";
import { checkCheckout, checkoutToken, fakeStripe, saveStripeKeys } from "./stripeFake.js";

const STRIPE_URL = "https://checkout.stripe.com/c/pay/cs_1";

describe("Feature 100 — Online Donations with Stripe", () => {
  let olivia;
  let org;
  let trip;
  let ana;
  let stripe;

  const anaId = () => ana.user.personId;

  const publicCheckout = (body = {}, authHeader = null) => {
    const req = request(app).post("/trips/public/donations/stripe-checkout");
    if (authHeader) req.set(authHeader);
    return req.send({
      tripId: trip.id,
      personId: anaId(),
      amount: 50,
      paymentMethod: "card",
      donor: { firstName: "Carl", lastName: "Diaz", email: "carl@example.com" },
      returnPath: "/donate/trip/Guatemala_Clinic_2027/participant/Ana_Lopez",
      ...body,
    });
  };

  const staffCheckout = (caller, body = {}) =>
    request(app)
      .post("/trips/donations/stripe-checkout")
      .set(caller.authHeader)
      .send({
        tripId: trip.id,
        personId: anaId(),
        amount: 75,
        paymentMethod: "us_bank_account",
        donor: { firstName: "Carl", lastName: "Diaz", email: "carl@example.com" },
        paymentInfo: "Phone gift",
        ...body,
      });

  const staffDonation = (body = {}) =>
    request(app)
      .post("/trips/donations")
      .set(olivia.authHeader)
      .send({
        tripId: trip.id,
        personId: anaId(),
        amount: 100,
        dateTime: "2027-01-20T18:00:00.000Z",
        donor: { firstName: "Carl", lastName: "Diaz", email: "carl@example.com" },
        ...body,
      });

  const lastCreateParams = () => stripe.creates().at(-1).params;

  const anaRaised = async () =>
    (await request(app).get(`/trips/public/trips/${trip.id}/participants/${anaId()}`)).body.donationTotal;

  const tripTotal = async () =>
    (await request(app).get("/trips/trips").set(olivia.authHeader)).body.find((row) => row.id === trip.id)
      .donationTotal;

  const anaOwes = async () =>
    (await request(app).get(`/trips/trips/browse/${trip.id}`).set(ana.authHeader)).body.myTripInfo.amountOwed;

  const sentEmails = () =>
    db.emailLog.findAll({ where: { subject: { [Op.ne]: "Login" } }, order: [["id", "ASC"]] });

  const addSendNowTemplate = async (typeCode, subject, emailBody = "Hello.") =>
    db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: (await db.emailType.findOne({ where: { typeCode } })).id,
      functionCode: "Send Now",
      fromEmail: "info@hope.org",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      subject,
      emailBody,
    });

  /** A pending checkout from a public credit card checkout for Ana; returns its session id. */
  const startPublicCheckout = async (body = {}) => {
    const res = await publicCheckout(body);
    expect(res.status).toBe(200);
    return /cs_\d+$/.exec(res.body.checkoutUrl)[0];
  };

  /** A recorded Processing Stripe-ACH donation for Ana (payment intent `pi_2`). */
  const processingAchDonation = async () => {
    await startPublicCheckout({ paymentMethod: "card" });
    const sessionId = await startPublicCheckout({ paymentMethod: "us_bank_account" });
    stripe.complete(sessionId, {
      paymentIntentId: "pi_2",
      status: "processing",
      charge: {
        id: "ch_2",
        receipt_url: null,
        payment_method_details: {
          type: "us_bank_account",
          us_bank_account: { bank_name: "STRIPE TEST BANK", last4: "6789" },
        },
      },
    });
    const check = await checkCheckout(sessionId);
    return { check, donation: await db.tripDonation.findOne({ where: { stripePaymentIntentId: "pi_2" } }) };
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    olivia = await createOrgAdminUser({ email: "olivia@hope.org", orgName: "Hope Missions" });
    org = olivia.org;
    await org.update({ email: "info@hope.org" });
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic 2027",
      location: "Guatemala City",
      status: "active",
      startDate: "2027-03-01",
      endDate: "2027-03-10",
      participantCost: 1500,
    });
    ana = await registerUser({ email: "ana@example.org", firstName: "Ana", lastName: "Lopez", orgIds: [org.id] });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: anaId(),
      roleId: (await findRole("Trip Participant")).id,
      status: "approved",
    });
    stripe = fakeStripe();
  });

  afterEach(async () => {
    stripe.restore();
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-100.1 — Connect an organization's Stripe account", () => {
    it("An Org Admin saves the Stripe keys", async () => {
      const save = (body) =>
        request(app).put(`/trips/organizations/${org.id}`).set(olivia.authHeader).send(body);

      const res = await save({ stripeSecretKey: "sk_live_abc", stripeTestSecretKey: "sk_test_xyz" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ stripeKeySaved: true, stripeTestKeySaved: true });
      expect(res.text).not.toContain("sk_live_abc");
      expect(res.text).not.toContain("sk_test_xyz");
      expect(res.body).not.toHaveProperty("stripeSecretKey");
      const [[row]] = await db.sequelize.query(
        `SELECT stripeSecretKey, stripeTestSecretKey FROM organizations WHERE id = ${org.id}`
      );
      expect(row.stripeSecretKey).toMatch(/^enc1:/);
      expect(decryptText(row.stripeSecretKey)).toBe("sk_live_abc");
      expect(decryptText(row.stripeTestSecretKey)).toBe("sk_test_xyz");

      const kept = await save({ stripeSecretKey: "", stripeTestSecretKey: "", phoneNumber: "5551234" });
      expect(kept.status).toBe(200);
      expect(kept.body).toMatchObject({ stripeKeySaved: true, stripeTestKeySaved: true });
      const reloaded = await db.organization.findByPk(org.id);
      expect(decryptText(reloaded.stripeSecretKey)).toBe("sk_live_abc");

      const wrong = await save({ stripeSecretKey: "sk_test_xyz" });
      expect(wrong.status).toBe(400);
      expect(wrong.body.message).toBe("Enter a live Stripe secret key (sk_live_ or rk_live_).");

      const fetched = await request(app).get(`/trips/organizations/${org.id}`).set(olivia.authHeader);
      expect(fetched.body).toMatchObject({ stripeKeySaved: true, stripeTestKeySaved: true });
      expect(fetched.text).not.toContain("enc1:");
    });
  });

  describe("US-100.2 — Donors pay with Stripe on the public donation pages", () => {
    beforeEach(async () => {
      await saveStripeKeys(org, { live: "sk_live_abc", test: "sk_test_xyz" });
    });

    it("A public donor starts a Stripe payment", async () => {
      const res = await publicCheckout();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ checkoutUrl: STRIPE_URL });
      const call = stripe.creates()[0];
      expect(call.key).toBe("sk_live_abc");
      const checkout = await db.donationCheckout.findOne();
      expect(call.idempotencyKey).toBe(checkout.token);
      expect(call.params).toMatchObject({
        mode: "payment",
        submit_type: "donate",
        payment_method_types: ["card"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: 5000,
              product_data: { name: "Guatemala Clinic 2027 – Ana Lopez" },
            },
          },
        ],
        payment_intent_data: {
          description: "Trip: Guatemala Clinic 2027; Participant: Ana Lopez; Donor: Carl Diaz",
          metadata: { tripName: "Guatemala Clinic 2027", participantName: "Ana Lopez" },
        },
        metadata: { tripName: "Guatemala Clinic 2027", participantName: "Ana Lopez" },
        client_reference_id: checkout.token,
        customer_email: "carl@example.com",
      });
      expect(call.params.success_url).toMatch(new RegExp(`/donate/complete/${checkout.token}$`));
      expect(call.params.cancel_url).toMatch(/\/donate\/trip\/Guatemala_Clinic_2027\/participant\/Ana_Lopez$/);
      expect(checkout).toMatchObject({
        status: "pending",
        donationType: "Stripe-Credit",
        stripeCheckoutSessionId: "cs_1",
        stripeTestMode: false,
      });
      expect(await db.tripDonation.count()).toBe(0);
    });

    it("A bank account checkout offers only ACH", async () => {
      const res = await publicCheckout({ paymentMethod: "us_bank_account" });

      expect(res.status).toBe(200);
      expect(lastCreateParams().payment_method_types).toEqual(["us_bank_account"]);
      expect((await db.donationCheckout.findOne()).donationType).toBe("Stripe-ACH");
    });

    it("Test mode uses the test key", async () => {
      await org.update({ testMode: true });

      const res = await publicCheckout({ personId: null });

      expect(res.status).toBe(200);
      expect(stripe.creates()[0].key).toBe("sk_test_xyz");
      expect(lastCreateParams().line_items[0].price_data.product_data.name).toBe("Guatemala Clinic 2027");
      expect((await db.donationCheckout.findOne()).stripeTestMode).toBe(true);
    });

    it("Checkout input is validated", async () => {
      const small = await publicCheckout({ amount: 0.25 });
      const noEmail = await publicCheckout({ donor: { firstName: "Carl", lastName: "Diaz" } });
      const paypal = await publicCheckout({ paymentMethod: "paypal" });

      expect([small.status, noEmail.status, paypal.status]).toEqual([400, 400, 400]);
      expect(small.body.message).toBe("Donation amount must be at least $0.50.");
      expect(noEmail.body.message).toBe("Your first name and email are required.");
      expect(paypal.body.message).toBe("Choose Credit card or Bank account (ACH).");
      expect(stripe.creates()).toHaveLength(0);
    });

    it("Online donations not set up", async () => {
      await saveStripeKeys(org, { live: null, test: "sk_test_xyz" });

      const page = await request(app).get(`/trips/public/trips/${trip.id}/participants/${anaId()}`);
      const res = await publicCheckout();

      expect(page.body.onlineDonations).toBe(false);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Online donations aren't set up for this organization yet.");
      expect(stripe.creates()).toHaveLength(0);
      const staffTrip = await request(app).get(`/trips/trips/${trip.id}`).set(olivia.authHeader);
      expect(staffTrip.body.onlineDonations).toBe(false);

      await saveStripeKeys(org);
      const setUp = await request(app).get(`/trips/public/trips/${trip.id}/participants/${anaId()}`);
      expect(setUp.body.onlineDonations).toBe(true);
      const staffTrips = await request(app).get("/trips/trips").set(olivia.authHeader);
      expect(staffTrips.body.find((row) => row.id === trip.id).onlineDonations).toBe(true);
      const setUpTrip = await request(app).get(`/trips/trips/${trip.id}`).set(olivia.authHeader);
      expect(setUpTrip.body.onlineDonations).toBe(true);
      expect(JSON.stringify(setUpTrip.body)).not.toContain("sk_live_");
    });

    it("Stripe failing to start the payment keeps no checkout", async () => {
      stripe.failCreate = true;

      const res = await publicCheckout();

      expect(res.status).toBe(502);
      expect(res.body.message).toBe("Stripe couldn't start the payment. Please try again.");
      expect(await db.donationCheckout.count()).toBe(0);
    });

    it("Donations without payment are no longer accepted", async () => {
      const unpaidPublic = await request(app)
        .post("/trips/public/donations")
        .send({ tripId: trip.id, personId: anaId(), amount: 50, donor: { firstName: "Carl" } });
      const unpaidParticipant = await request(app)
        .post("/trips/donations/participant")
        .set(ana.authHeader)
        .send({ tripId: trip.id, personId: anaId(), amount: 50 });

      expect(unpaidPublic.status).toBe(404);
      expect(unpaidParticipant.status).toBe(404);
      expect(await db.tripDonation.count()).toBe(0);
    });
  });

  describe("US-100.3 — Participants pay with Stripe from the Donate and Make Donation dialogs", () => {
    it("Participant checkouts keep the donation rules", async () => {
      await saveStripeKeys(org);
      const ben = await registerUser({ email: "ben@example.org", firstName: "Ben", lastName: "Cruz", orgIds: [org.id] });
      await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: ben.user.personId,
        roleId: (await findRole("Trip Participant")).id,
        status: "incomplete",
      });

      const res = await request(app)
        .post("/trips/donations/participant/stripe-checkout")
        .set(ben.authHeader)
        .send({ tripId: trip.id, personId: ben.user.personId, amount: 25, paymentMethod: "card" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "You can donate to yourself only on trips where you are pre-approved or approved."
      );
      expect(stripe.creates()).toHaveLength(0);

      const own = await request(app)
        .post("/trips/donations/participant/stripe-checkout")
        .set(ana.authHeader)
        .send({ tripId: trip.id, personId: anaId(), amount: 25, paymentMethod: "card", returnPath: "/home" });
      expect(own.status).toBe(200);
      expect(lastCreateParams().customer_email).toBe("ana@example.org");
      expect(lastCreateParams().payment_intent_data.description).toBe(
        "Trip: Guatemala Clinic 2027; Participant: Ana Lopez; Donor: Ana Lopez"
      );
      expect((await db.donationCheckout.findOne()).giverPersonId).toBe(anaId());
    });
  });

  describe("US-100.4 — A completed Stripe payment is recorded", () => {
    beforeEach(async () => {
      await saveStripeKeys(org);
      await seedEmailTypes();
      await seedEmailTokens();
      await addSendNowTemplate("donation-received", "Donation received");
      await addSendNowTemplate("trip-donation", "Thank you for your donation to {{TRIP_NAME}}");
    });

    it("A completed payment is recorded once", async () => {
      const sessionId = await startPublicCheckout();
      stripe.complete(sessionId, { paymentIntentId: "pi_1", created: "2027-01-15T14:30:00Z" });

      const first = await checkCheckout(sessionId);
      const second = await checkCheckout(sessionId);

      const donations = await db.tripDonation.findAll({ include: [{ model: db.donor, as: "donor" }] });
      expect(donations).toHaveLength(1);
      const [donation] = donations;
      expect(donation).toMatchObject({
        personId: anaId(),
        donationType: "Stripe-Credit",
        paymentStatus: "succeeded",
        stripePaymentMethodType: "card",
        stripePaymentMethodBrand: "visa",
        stripePaymentMethodLast4: "4242",
        stripeCheckoutSessionId: "cs_1",
        stripePaymentIntentId: "pi_1",
        stripeChargeId: "ch_1",
        stripeReceiptUrl: "https://pay.stripe.com/receipts/ch_1",
      });
      expect(Number(donation.amount)).toBe(50);
      expect(donation.dateTime.toISOString()).toBe("2027-01-15T14:30:00.000Z");
      expect(JSON.parse(donation.stripeData)).toMatchObject({ id: "cs_1", payment_intent: { id: "pi_1" } });
      expect(donation.donor).toMatchObject({ firstName: "Carl", lastName: "Diaz", email: "carl@example.com" });
      expect(await anaRaised()).toBe(50);

      const checkout = await db.donationCheckout.findOne();
      expect(checkout).toMatchObject({ status: "completed", tripDonationId: donation.id });
      const answer = {
        status: "completed",
        paymentStatus: "succeeded",
        failureMessage: null,
        amount: 50,
        feeCovered: null,
        tripName: "Guatemala Clinic 2027",
        participantName: "Ana Lopez",
        receiptUrl: "https://pay.stripe.com/receipts/ch_1",
        returnPath: "/donate/trip/Guatemala_Clinic_2027/participant/Ana_Lopez",
      };
      expect(first.body).toEqual(answer);
      expect(second.body).toEqual(answer);

      const subjects = (await sentEmails()).map((log) => log.subject).sort();
      expect(subjects).toEqual([
        "Donation received",
        "Thank you for your donation to Guatemala Clinic 2027",
        "Thank you for your donation to Guatemala Clinic 2027",
      ]);
    });

    it("An unpaid checkout isn't recorded", async () => {
      const sessionId = await startPublicCheckout();

      const pending = await checkCheckout(sessionId);

      expect(pending.body.status).toBe("pending");
      expect(await db.tripDonation.count()).toBe(0);

      stripe.sessions.get(sessionId).status = "expired";
      const expired = await checkCheckout(sessionId);
      expect(expired.body.status).toBe("expired");
      expect((await db.donationCheckout.findOne()).status).toBe("expired");

      const unknown = await request(app).post("/trips/public/donations/stripe-checkout/nope/check");
      expect(unknown.status).toBe(404);
      expect(unknown.body.message).toBe("Donation not found.");
    });

    it("The background check records a payment the donor didn't return from", async () => {
      const paid = await startPublicCheckout();
      const unpaid = await startPublicCheckout();
      const old = await startPublicCheckout();
      stripe.complete(paid);
      const oldToken = await checkoutToken(old);
      await db.sequelize.query(
        "UPDATE donationCheckouts SET createdAt = DATE_SUB(NOW(), INTERVAL 26 HOUR) WHERE token = :token",
        { replacements: { token: oldToken } }
      );

      await runStripeChecks();

      const byToken = async (sessionId) =>
        db.donationCheckout.findOne({ where: { stripeCheckoutSessionId: sessionId } });
      expect((await byToken(paid)).status).toBe("completed");
      expect((await byToken(unpaid)).status).toBe("pending");
      expect((await byToken(old)).status).toBe("expired");
      expect(await db.tripDonation.count()).toBe(1);
    });
  });

  describe("US-100.5 — Staff record donations by type", () => {
    it("Staff record a Check donation", async () => {
      const res = await staffDonation({ donationType: "Check", checkNumber: "1042" });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ donationType: "Check", checkNumber: "1042", paymentStatus: null });

      const missing = await staffDonation({ donationType: "Check" });
      expect(missing.status).toBe(400);
      expect(missing.body.message).toBe("Check number is required.");

      for (const donationType of ["Stripe-Credit", "Stripe-ACH"]) {
        const stripeType = await staffDonation({ donationType });
        expect(stripeType.status).toBe(400);
        expect(stripeType.body.message).toBe("Use Pay with Stripe for Stripe-ACH and Stripe-Credit donations.");
      }

      const other = await request(app)
        .put(`/trips/donations/${res.body.id}`)
        .set(olivia.authHeader)
        .send({ donationType: "Other", checkNumber: "1042", version: res.body.version });
      expect(other.status).toBe(200);
      expect(other.body).toMatchObject({ donationType: "Other", checkNumber: null });
    });

    it("Staff take a Stripe payment", async () => {
      await saveStripeKeys(org);

      const res = await staffCheckout(olivia, { returnPath: "/donations" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ checkoutUrl: STRIPE_URL });
      expect(lastCreateParams()).toMatchObject({
        payment_method_types: ["us_bank_account"],
        customer_email: "carl@example.com",
      });
      const checkout = await db.donationCheckout.findOne({ include: [{ model: db.donor, as: "donor" }] });
      expect(checkout).toMatchObject({
        donationType: "Stripe-ACH",
        paymentInfo: "Phone gift",
        returnPath: "/donations",
      });
      expect(checkout.donor).toMatchObject({ firstName: "Carl", email: "carl@example.com" });
      expect(lastCreateParams().cancel_url).toMatch(/\/donations$/);

      const refused = await staffCheckout(ana);
      expect(refused.status).toBe(403);
    });

    it("A Stripe donation's amount can't be changed", async () => {
      await saveStripeKeys(org);
      const sessionId = await startPublicCheckout();
      stripe.complete(sessionId);
      await checkCheckout(sessionId);
      const donation = await db.tripDonation.findOne();

      const changed = await request(app)
        .put(`/trips/donations/${donation.id}`)
        .set(olivia.authHeader)
        .send({ amount: 60, version: donation.version });

      expect(changed.status).toBe(400);
      expect(changed.body.message).toBe("A Stripe donation's amount, date, and type can't be changed.");

      const info = await request(app)
        .put(`/trips/donations/${donation.id}`)
        .set(olivia.authHeader)
        .send({ amount: 50, paymentInfo: "Thank-you card sent", version: donation.version });
      expect(info.status).toBe(200);
      expect(info.body).toMatchObject({ paymentInfo: "Thank-you card sent", donationType: "Stripe-Credit" });
      expect(Number(info.body.amount)).toBe(50);
    });

    it("Existing donations become Other", async () => {
      const donation = await db.tripDonation.create({ tripId: trip.id, personId: anaId(), amount: 20 });
      await db.sequelize.query("ALTER TABLE tripDonations DROP COLUMN donationType");

      await ensureSchema();

      const [[row]] = await db.sequelize.query(`SELECT donationType FROM tripDonations WHERE id = ${donation.id}`);
      expect(row.donationType).toBe("Other");
      expect(await db.emailType.count({ where: { typeCode: "trip-donation" } })).toBe(1);
      expect(
        await db.emailToken.count({
          where: { tokenCode: ["DONATION_DATE", "DONATION_TYPE", "DONATION_AMOUNT", "DONATION_FEE_COVERED"] },
        })
      ).toBe(4);
    });
  });

  describe("US-100.6 — Trip Donation email", () => {
    it("A new donation emails the donor and the participant", async () => {
      await seedEmailTypes();
      await seedEmailTokens();
      await addSendNowTemplate(
        "trip-donation",
        "Thanks from {{TRIP_NAME}}",
        "Date {{DONATION_DATE}}; type {{DONATION_TYPE}}; amount {{DONATION_AMOUNT}}; trip {{TRIP_NAME}}; participant {{PARTICIPANT_FIRST_NAME}}"
      );

      const res = await staffDonation({ donationType: "Check", checkNumber: "1042" });

      expect(res.status).toBe(200);
      const logs = await sentEmails();
      expect(logs.map((log) => log.toEmail).sort()).toEqual(["ana@example.org", "carl@example.com"]);
      for (const log of logs) {
        expect(log.subject).toBe("Thanks from Guatemala Clinic 2027");
        expect(log.content).toContain(
          "Date 01/20/2027; type Check; amount $100.00; trip Guatemala Clinic 2027; participant Ana"
        );
      }

      const sysAdmin = await createSystemAdminUser();
      const sources = await request(app).get("/trips/email-tokens/value-sources").set(sysAdmin.authHeader);
      const labels = sources.body.map((source) => source.label);
      expect(labels).toEqual(
        expect.arrayContaining(["Donation date", "Donation type", "Donation amount", "Donation fee covered"])
      );
    });
  });

  describe("US-100.7 — Donations for a date range, with CSV", () => {
    beforeEach(async () => {
      for (const [dateTime, extra] of [
        ["2027-01-05T18:00:00.000Z", {}],
        ["2027-01-15T18:00:00.000Z", { donationType: "Check", checkNumber: "1042" }],
        ["2027-02-01T18:00:00.000Z", {}],
      ]) {
        await db.tripDonation.create({ tripId: trip.id, personId: anaId(), amount: 10, dateTime, ...extra });
      }
    });

    it("The donations list filters by date range", async () => {
      const res = await request(app)
        .get("/trips/donations")
        .query({ tripId: trip.id, startDate: "2027-01-10", endDate: "2027-01-31" })
        .set(olivia.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.map((row) => row.dateTime)).toEqual(["2027-01-15T18:00:00.000Z"]);
      expect(res.body[0]).toMatchObject({ donationType: "Check", checkNumber: "1042", paymentStatus: null });
    });

    it("The CSV exports the selected range", async () => {
      const res = await request(app)
        .get(`/trips/export/trips/${trip.id}/donations.csv`)
        .query({ startDate: "2027-01-10", endDate: "2027-01-31" })
        .set(olivia.authHeader);

      expect(res.status).toBe(200);
      expect(res.headers["content-disposition"]).toContain(
        `trip-${trip.id}-donations-2027-01-10-to-2027-01-31.csv`
      );
      const lines = res.text.trim().replace(/^\uFEFF/, "").split(/\r?\n/);
      expect(lines[0]).toBe(
        "Date,Amount,Fee Covered,Type,Check Number,Payment Status,Payment Method,Participant,Donor,Donor Email,Payment Info,Stripe Payment ID,Stripe Charge ID"
      );
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain(",Check,1042,");
    });
  });

  describe("US-100.8 — Bank payments are tracked until they clear", () => {
    beforeEach(async () => {
      await saveStripeKeys(org);
      await seedEmailTypes();
      await seedEmailTokens();
      await addSendNowTemplate("donation-received", "Donation received");
      await addSendNowTemplate("trip-donation", "Trip donation");
    });

    it("A bank payment is recorded as Processing and not counted", async () => {
      const { check, donation } = await processingAchDonation();

      expect(donation).toMatchObject({
        personId: anaId(),
        donationType: "Stripe-ACH",
        paymentStatus: "processing",
        stripePaymentMethodType: "us_bank_account",
        stripePaymentMethodBrand: "STRIPE TEST BANK",
        stripePaymentMethodLast4: "6789",
        stripePaymentIntentId: "pi_2",
      });
      expect(await anaRaised()).toBe(0);
      expect(await tripTotal()).toBe(0);
      expect(await anaOwes()).toBe(1500);
      expect(await sentEmails()).toHaveLength(0);
      expect(check.body).toMatchObject({ status: "completed", paymentStatus: "processing" });
    });

    it("A processing bank payment that clears is counted and emailed", async () => {
      const { donation } = await processingAchDonation();
      Object.assign(stripe.paymentIntents.get("pi_2"), {
        status: "succeeded",
        latest_charge: {
          id: "ch_2",
          receipt_url: "https://pay.stripe.com/receipts/ch_2",
          payment_method_details: {
            type: "us_bank_account",
            us_bank_account: { bank_name: "STRIPE TEST BANK", last4: "6789" },
          },
        },
      });

      await runStripeChecks();
      await runStripeChecks();

      await donation.reload();
      expect(donation).toMatchObject({
        paymentStatus: "succeeded",
        stripeChargeId: "ch_2",
        stripeReceiptUrl: "https://pay.stripe.com/receipts/ch_2",
      });
      expect(donation.paymentStatusUpdatedAt).toBeInstanceOf(Date);
      expect(await anaRaised()).toBe(50);
      const subjects = (await sentEmails()).map((log) => log.subject).sort();
      expect(subjects).toEqual(["Donation received", "Trip donation", "Trip donation"]);
    });

    it("A failed bank payment is marked Failed and never counted", async () => {
      const { donation } = await processingAchDonation();
      Object.assign(stripe.paymentIntents.get("pi_2"), {
        status: "requires_payment_method",
        last_payment_error: { message: "The customer's bank account has insufficient funds." },
      });

      await runStripeChecks();

      await donation.reload();
      expect(donation.paymentStatus).toBe("failed");
      expect(donation.stripeFailureMessage).toBe("The customer's bank account has insufficient funds.");
      expect(await anaRaised()).toBe(0);
      expect(await tripTotal()).toBe(0);
      expect(await sentEmails()).toHaveLength(0);

      const intentCalls = () => stripe.calls.filter((call) => call.path.startsWith("/payment_intents/")).length;
      const before = intentCalls();
      await runStripeChecks();
      expect(intentCalls()).toBe(before);
    });
  });

  describe("US-100.9 — Donors can cover the processing fee", () => {
    const versionOf = (call) => call.apiVersion ?? STRIPE_API_VERSION;

    it("An Org Admin turns on fee coverage", async () => {
      const res = await request(app)
        .put(`/trips/organizations/${org.id}`)
        .set(olivia.authHeader)
        .send({ stripeFeeCoverage: true, version: org.version });

      expect(res.status).toBe(200);
      expect(res.body.stripeFeeCoverage).toBe(true);
      expect((await db.organization.findByPk(org.id)).stripeFeeCoverage).toBe(true);

      const sysAdmin = await createSystemAdminUser();
      const created = await request(app)
        .post("/trips/organizations")
        .set(sysAdmin.authHeader)
        .send({ name: "Grace Outreach" });
      expect(created.status).toBe(200);
      expect(created.body.stripeFeeCoverage).toBe(false);
    });

    describe("with Stripe keys saved", () => {
      beforeEach(async () => {
        await saveStripeKeys(org);
      });

      it("A card checkout asks the donor to cover the processing fee", async () => {
        await org.update({ stripeFeeCoverage: true });

        const res = await publicCheckout();

        expect(res.status).toBe(200);
        const call = stripe.creates()[0];
        expect(versionOf(call)).toBe(STRIPE_FEE_COVERAGE_API_VERSION);
        expect(call.params).toMatchObject({
          allowed_payment_method_types: ["card"],
          fee_coverage: { enabled: true },
          line_items: [{ price_data: { unit_amount: 5000 } }],
        });
        expect(call.params).not.toHaveProperty("payment_method_types");
        expect((await db.donationCheckout.findOne()).feeCoverageOffered).toBe(true);
      });

      it("Bank checkouts and organizations without the setting aren't asked", async () => {
        await org.update({ stripeFeeCoverage: true });
        await publicCheckout({ paymentMethod: "us_bank_account" });
        await org.update({ stripeFeeCoverage: false });
        await publicCheckout({ paymentMethod: "card" });

        const [bank, card] = stripe.creates();
        expect(versionOf(bank)).toBe(STRIPE_API_VERSION);
        expect(bank.params.payment_method_types).toEqual(["us_bank_account"]);
        expect(bank.params).not.toHaveProperty("fee_coverage");
        expect(bank.params).not.toHaveProperty("allowed_payment_method_types");
        expect(versionOf(card)).toBe(STRIPE_API_VERSION);
        expect(card.params.payment_method_types).toEqual(["card"]);
        expect(card.params).not.toHaveProperty("fee_coverage");
        const checkouts = await db.donationCheckout.findAll({ order: [["id", "ASC"]] });
        expect(checkouts.map((checkout) => checkout.feeCoverageOffered)).toEqual([false, false]);
      });

      it("A covered processing fee is recorded apart from the gift", async () => {
        await org.update({ stripeFeeCoverage: true });
        await seedEmailTypes();
        await seedEmailTokens();
        await addSendNowTemplate(
          "trip-donation",
          "Thank you",
          "Amount {{DONATION_AMOUNT}}; fee covered {{DONATION_FEE_COVERED}}."
        );
        const sessionId = await startPublicCheckout();
        stripe.complete(sessionId, { paymentIntentId: "pi_3", feeCoveredCents: 175 });

        const check = await checkCheckout(sessionId);

        const retrieve = stripe.calls.find((call) => call.method === "GET" && call.path.startsWith("/checkout/"));
        expect(versionOf(retrieve)).toBe(STRIPE_FEE_COVERAGE_API_VERSION);
        const donation = await db.tripDonation.findOne({ where: { stripePaymentIntentId: "pi_3" } });
        expect(Number(donation.amount)).toBe(50);
        expect(Number(donation.processingFeeAmount)).toBe(1.75);
        expect(await anaRaised()).toBe(50);
        expect(check.body).toMatchObject({ status: "completed", amount: 50, feeCovered: 1.75 });

        const list = await request(app).get("/trips/donations").query({ tripId: trip.id }).set(olivia.authHeader);
        expect(Number(list.body[0].processingFeeAmount)).toBe(1.75);
        const csv = await request(app).get(`/trips/export/trips/${trip.id}/donations.csv`).set(olivia.authHeader);
        const [, row] = csv.text.trim().replace(/^\uFEFF/, "").split(/\r?\n/);
        expect(row).toMatch(/^[^,]+,50\.00,1\.75,Stripe-Credit,/);

        const logs = await sentEmails();
        expect(logs.length).toBeGreaterThan(0);
        for (const log of logs) expect(log.content).toContain("Amount $50.00; fee covered $1.75.");
      });

      it("A donor who removes the fee offer covers no fee", async () => {
        await org.update({ stripeFeeCoverage: true });
        const sessionId = await startPublicCheckout();
        stripe.complete(sessionId);

        const check = await checkCheckout(sessionId);

        const donation = await db.tripDonation.findOne();
        expect(Number(donation.amount)).toBe(50);
        expect(donation.processingFeeAmount).toBeNull();
        expect(check.body.feeCovered).toBeNull();
      });
    });
  });
});
