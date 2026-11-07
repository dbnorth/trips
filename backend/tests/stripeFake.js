import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { stripeClient, StripeRequestError } from "../app/utils/stripeClient.js";
import { encryptValue } from "../app/utils/personalDataEncryption.js";

/** Save encrypted Stripe keys on an organization. */
export const saveStripeKeys = (org, { live = "sk_live_abc", test = null } = {}) =>
  db.organization.update(
    {
      stripeSecretKey: live ? encryptValue(live) : null,
      stripeTestSecretKey: test ? encryptValue(test) : null,
    },
    { where: { id: org.id } }
  );

const visaCharge = (id) => ({
  id,
  receipt_url: `https://pay.stripe.com/receipts/${id}`,
  payment_method_details: { type: "card", card: { brand: "visa", last4: "4242" } },
});

/**
 * Replace the HTTP calls to Stripe. Created sessions are `cs_1`, `cs_2`, … (open, unpaid);
 * `complete` marks one paid. Call `restore` after each test.
 */
export const fakeStripe = () => {
  const original = stripeClient.request;
  const calls = [];
  const sessions = new Map();
  const paymentIntents = new Map();
  let created = 0;

  const fake = {
    calls,
    sessions,
    paymentIntents,
    failCreate: false,
    creates: () => calls.filter((call) => call.method === "POST" && call.path === "/checkout/sessions"),
    restore: () => {
      stripeClient.request = original;
    },
    /**
     * Mark a session complete with a payment intent (succeeded by default, paid by Visa 4242).
     * `feeCoveredCents` adds a covered processing fee to the total, as Stripe's fee coverage does.
     */
    complete: (
      sessionId,
      {
        paymentIntentId = `pi_${sessionId.slice(3)}`,
        status = "succeeded",
        created: createdAt = "2027-01-15T14:30:00Z",
        charge = visaCharge(`ch_${sessionId.slice(3)}`),
        lastPaymentError = null,
        feeCoveredCents = 0,
      } = {}
    ) => {
      const session = sessions.get(sessionId);
      const paymentIntent = {
        id: paymentIntentId,
        status,
        created: Math.floor(new Date(createdAt).getTime() / 1000),
        latest_charge: charge,
        last_payment_error: lastPaymentError,
      };
      paymentIntents.set(paymentIntentId, paymentIntent);
      if (feeCoveredCents) {
        session.amount_total += feeCoveredCents;
        session.fee_coverage_cost = { amount_total: feeCoveredCents };
      }
      Object.assign(session, {
        status: "complete",
        payment_status: status === "succeeded" ? "paid" : "unpaid",
        payment_intent: paymentIntent,
      });
      return paymentIntent;
    },
  };

  stripeClient.request = async (call) => {
    calls.push(call);
    const { method, path } = call;
    if (method === "POST" && path === "/checkout/sessions") {
      if (fake.failCreate) throw new StripeRequestError("Stripe is down.");
      created += 1;
      const id = `cs_${created}`;
      const session = {
        id,
        url: `https://checkout.stripe.com/c/pay/${id}`,
        status: "open",
        payment_status: "unpaid",
        amount_total: call.params.line_items[0].price_data.unit_amount,
        payment_intent: null,
      };
      sessions.set(id, session);
      return session;
    }
    const sessionMatch = /^\/checkout\/sessions\/(.+)$/.exec(path);
    if (method === "GET" && sessionMatch) {
      const session = sessions.get(decodeURIComponent(sessionMatch[1]));
      if (!session) throw new StripeRequestError("No such checkout session.");
      return JSON.parse(JSON.stringify(session));
    }
    const intentMatch = /^\/payment_intents\/(.+)$/.exec(path);
    if (method === "GET" && intentMatch) {
      const paymentIntent = paymentIntents.get(decodeURIComponent(intentMatch[1]));
      if (!paymentIntent) throw new StripeRequestError("No such payment intent.");
      return JSON.parse(JSON.stringify(paymentIntent));
    }
    throw new StripeRequestError(`Unexpected Stripe call ${method} ${path}.`);
  };

  return fake;
};

/** The token of the checkout for a Stripe session. */
export const checkoutToken = async (sessionId) =>
  (await db.donationCheckout.findOne({ where: { stripeCheckoutSessionId: sessionId } })).token;

/** Check a checkout the way the return page does. */
export const checkCheckout = async (sessionId) =>
  request(app).post(`/trips/public/donations/stripe-checkout/${await checkoutToken(sessionId)}/check`);

/**
 * Start a checkout, have Stripe report it paid, and check it.
 * Returns `{ start, check, donation }` (`donation` is null when the start failed).
 */
export const payWithStripe = async (fake, { path, authHeader = null, body, complete = {} }) => {
  const req = request(app).post(path);
  if (authHeader) req.set(authHeader);
  const start = await req.send({ paymentMethod: "card", ...body });
  if (start.status !== 200) return { start, check: null, donation: null };
  const sessionId = /cs_\d+$/.exec(start.body.checkoutUrl)[0];
  fake.complete(sessionId, complete);
  const check = await checkCheckout(sessionId);
  const checkout = await db.donationCheckout.findOne({ where: { stripeCheckoutSessionId: sessionId } });
  const donation = checkout.tripDonationId
    ? await db.tripDonation.findByPk(checkout.tripDonationId, { include: [{ model: db.donor, as: "donor" }] })
    : null;
  return { start, check, donation };
};
