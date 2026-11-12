import crypto from "crypto";
import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { decryptText } from "./personalDataEncryption.js";
import {
  STRIPE_FEE_COVERAGE_API_VERSION,
  createCheckoutSession,
  retrieveCheckoutSession,
  retrievePaymentIntent,
} from "./stripeClient.js";
import { findOrCreateLinkedDonor } from "./donorPerson.js";
import { normalizeEmail } from "./userPerson.js";
import { sendCountedDonationEmails } from "./eventEmails.js";
import { donationCounts } from "./donationCounting.js";
import { toUrlSlug } from "./urlSlug.js";

export const ONLINE_DONATIONS_NOT_SET_UP = "Online donations aren't set up for this organization yet.";
export const STRIPE_START_FAILED = "Stripe couldn't start the payment. Please try again.";
export const STRIPE_ORG_ATTRIBUTES = [
  "id",
  "name",
  "testMode",
  "stripeSecretKey",
  "stripeTestSecretKey",
  "stripeFeeCoverage",
];

/** Stripe sessions expire after 24 hours; pending checkouts older than this are expired. */
const CHECKOUT_LIFETIME_MS = 25 * 60 * 60 * 1000;
export const STRIPE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const MIN_DONATION_AMOUNT = 0.5;

const DONATION_TYPE_BY_METHOD = { card: "Stripe-Credit", us_bank_account: "Stripe-ACH" };

export class StripeStartError extends Error {}

const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();

const savedKey = (org, testMode) => {
  const stored = org?.getDataValue(testMode ? "stripeTestSecretKey" : "stripeSecretKey");
  return stored ? decryptText(stored) : null;
};

/** Online donations are set up when the organization has the key for its current mode. */
export const onlineDonationsSetUp = (org) =>
  !!org?.getDataValue(org.testMode ? "stripeTestSecretKey" : "stripeSecretKey");

export const loadStripeOrganization = (orgId) =>
  db.organization.findByPk(orgId, { attributes: STRIPE_ORG_ATTRIBUTES });

export const tripOnlineDonations = async (trip) =>
  onlineDonationsSetUp(await loadStripeOrganization(trip.orgId));

/** Amount and payment method checks shared by every checkout; returns a message or null. */
export const checkoutInputError = ({ amount, paymentMethod }) => {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < MIN_DONATION_AMOUNT) return "Donation amount must be at least $0.50.";
  if (!DONATION_TYPE_BY_METHOD[paymentMethod]) return "Choose Credit card or Bank account (ACH).";
  return null;
};

export const publicDonationPath = (trip) => `/donate/trip/${toUrlSlug(trip.name)}`;

/** A path within the app (one leading `/`), else the trip's public donation page. */
export const safeReturnPath = (returnPath, trip) => {
  const path = typeof returnPath === "string" ? returnPath.trim() : "";
  const inApp = path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") && path.length <= 500;
  return inApp ? path : publicDonationPath(trip);
};

const appUrl = () => (process.env.APP_URL || "http://localhost:8082").replace(/\/+$/, "");

/**
 * Save a pending checkout and create its Stripe Checkout Session.
 * `fields` are the checkout's donor columns (`giverPersonId`, `donorFirstName`, `donorLastName`,
 * `donorEmail`, `donorId`, `paymentInfo`); `donorDisplay` names the donor to Stripe.
 * Returns `{ checkoutUrl }`; throws `StripeStartError` when Stripe fails.
 */
export const startCheckout = async ({
  trip,
  org,
  participant,
  amount,
  paymentMethod,
  returnPath,
  fields,
  donorDisplay,
}) => {
  const testMode = !!org.testMode;
  const key = savedKey(org, testMode);
  const cents = Math.round(Number(amount) * 100);
  const token = crypto.randomBytes(32).toString("hex");
  const participantName = personName(participant);
  // Stripe offers fee coverage only for card-only sessions.
  const feeCoverage = !!org.stripeFeeCoverage && paymentMethod === "card";
  const checkout = await db.donationCheckout.create({
    ...fields,
    token,
    tripId: trip.id,
    personId: participant?.id ?? null,
    amount: cents / 100,
    donationType: DONATION_TYPE_BY_METHOD[paymentMethod],
    stripeTestMode: testMode,
    feeCoverageOffered: feeCoverage,
    returnPath,
  });
  const metadata = { tripName: trip.name, participantName };
  let session;
  try {
    session = await createCheckoutSession(
      key,
      {
        mode: "payment",
        submit_type: "donate",
        ...(feeCoverage
          ? { allowed_payment_method_types: ["card"], fee_coverage: { enabled: true } }
          : { payment_method_types: [paymentMethod] }),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: cents,
              product_data: { name: participantName ? `${trip.name} – ${participantName}` : trip.name },
            },
          },
        ],
        payment_intent_data: {
          description: `Trip: ${trip.name}; Participant: ${participantName || "none"}; Donor: ${personName(donorDisplay)}`,
          metadata,
        },
        metadata,
        client_reference_id: token,
        customer_email: donorDisplay?.email?.trim() || null,
        success_url: `${appUrl()}/donate/complete/${token}`,
        cancel_url: `${appUrl()}${returnPath}`,
      },
      token,
      feeCoverage ? STRIPE_FEE_COVERAGE_API_VERSION : undefined
    );
  } catch (err) {
    logger.error(`Starting a Stripe checkout for trip ${trip.id} failed: ${err.message}`);
    await checkout.destroy();
    throw new StripeStartError(STRIPE_START_FAILED);
  }
  await checkout.update({ stripeCheckoutSessionId: session.id, stripeCheckoutUrl: session.url });
  return { checkoutUrl: session.url };
};

const paymentStatusOf = (paymentIntent) => {
  if (paymentIntent.status === "succeeded") return "succeeded";
  if (["requires_payment_method", "canceled"].includes(paymentIntent.status)) return "failed";
  return "processing";
};

/** Payment status, failure reason, payment method, charge, and receipt from a payment intent. */
const paymentFields = (paymentIntent) => {
  const charge = paymentIntent.latest_charge && typeof paymentIntent.latest_charge === "object"
    ? paymentIntent.latest_charge
    : null;
  const details = charge?.payment_method_details;
  const methodType = details?.type ?? null;
  const method = methodType ? details[methodType] : null;
  const paymentStatus = paymentStatusOf(paymentIntent);
  const failure =
    paymentStatus === "failed"
      ? paymentIntent.last_payment_error?.message || charge?.failure_message || null
      : null;
  return {
    paymentStatus,
    stripeFailureMessage: failure ? String(failure).slice(0, 500) : null,
    stripePaymentMethodType: methodType,
    stripePaymentMethodBrand: method?.brand ?? method?.bank_name ?? null,
    stripePaymentMethodLast4: method?.last4 ?? null,
    stripeChargeId:
      charge?.id ?? (typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null),
    stripeReceiptUrl: charge?.receipt_url ?? null,
  };
};

const resolveDonorId = async (checkout) => {
  const trip = await db.trip.findByPk(checkout.tripId, { attributes: ["orgId"] });
  const orgId = trip?.orgId ?? null;
  if (checkout.donorId) return checkout.donorId;
  const details =
    checkout.donorFirstName || checkout.donorEmail
      ? {
          firstName: checkout.donorFirstName,
          lastName: checkout.donorLastName,
          email: normalizeEmail(checkout.donorEmail),
        }
      : null;
  if (checkout.giverPersonId) return (await findOrCreateLinkedDonor(checkout.giverPersonId, details, orgId)).id;
  if (details) {
    if (details.email) {
      const existing = await db.donor.findOne({ where: { orgId, email: details.email } });
      if (existing) return existing.id;
    }
    return (await db.donor.create({ ...details, status: "active", orgId })).id;
  }
  return null;
};

/** Record the donation for a completed session at most once; returns the donation when this call created it. */
const recordDonation = async (checkoutId, session) => {
  const paymentIntent = session.payment_intent;
  return db.sequelize.transaction(async (transaction) => {
    const checkout = await db.donationCheckout.findByPk(checkoutId, { transaction, lock: transaction.LOCK.UPDATE });
    if (checkout.status !== "pending") return null;
    const existing = await db.tripDonation.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
      transaction,
    });
    if (existing) {
      await checkout.update({ status: "completed", tripDonationId: existing.id }, { transaction });
      return null;
    }
    const feeCents = Number(session.fee_coverage_cost?.amount_total) || 0;
    const donation = await db.tripDonation.create(
      {
        tripId: checkout.tripId,
        personId: checkout.personId,
        donorId: await resolveDonorId(checkout),
        amount: (Number(session.amount_total) - feeCents) / 100,
        processingFeeAmount: feeCents ? feeCents / 100 : null,
        dateTime: new Date(Number(paymentIntent.created) * 1000),
        paymentInfo: checkout.paymentInfo,
        donationType: checkout.donationType,
        ...paymentFields(paymentIntent),
        paymentStatusUpdatedAt: new Date(),
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeData: JSON.stringify(session),
      },
      { transaction }
    );
    await checkout.update({ status: "completed", tripDonationId: donation.id }, { transaction });
    return donation;
  });
};

/**
 * Ask Stripe about a pending checkout: a complete session records its donation (emails when it
 * counts), an expired one expires the checkout, anything else leaves it pending.
 */
export const checkCheckout = async (checkout) => {
  if (checkout.status !== "pending" || !checkout.stripeCheckoutSessionId) return;
  const trip = await db.trip.findByPk(checkout.tripId, { attributes: ["id", "orgId"] });
  const key = savedKey(await loadStripeOrganization(trip.orgId), checkout.stripeTestMode);
  if (!key) throw new Error("The organization has no Stripe key for this checkout's mode.");
  const session = await retrieveCheckoutSession(
    key,
    checkout.stripeCheckoutSessionId,
    checkout.feeCoverageOffered ? STRIPE_FEE_COVERAGE_API_VERSION : undefined
  );
  if (session.status === "expired") {
    await db.donationCheckout.update({ status: "expired" }, { where: { id: checkout.id, status: "pending" } });
    return;
  }
  if (session.status !== "complete" || !session.payment_intent?.id) return;
  let donation;
  try {
    donation = await recordDonation(checkout.id, session);
  } catch (err) {
    if (!(err instanceof db.Sequelize.UniqueConstraintError)) throw err;
    return;
  }
  if (donation && donationCounts(donation)) {
    await sendCountedDonationEmails(donation, { donorEntered: checkout.donorId == null });
  }
};

/** What the return page shows for a checkout. */
export const checkoutAnswer = async (checkout) => {
  const trip = await db.trip.findByPk(checkout.tripId, { attributes: ["id", "name"] });
  const participant = checkout.personId
    ? await db.person.findByPk(checkout.personId, { attributes: ["firstName", "lastName"] })
    : null;
  const donation = checkout.tripDonationId ? await db.tripDonation.findByPk(checkout.tripDonationId) : null;
  return {
    status: checkout.status,
    paymentStatus: donation?.paymentStatus ?? null,
    failureMessage: donation?.stripeFailureMessage ?? null,
    amount: Number(donation?.amount ?? checkout.amount),
    feeCovered: donation?.processingFeeAmount != null ? Number(donation.processingFeeAmount) : null,
    tripName: trip?.name ?? "",
    participantName: personName(participant),
    receiptUrl: donation?.stripeReceiptUrl ?? null,
    returnPath: checkout.returnPath,
  };
};

/** Check the checkout with this token and describe it; `null` when there is none. */
export const checkCheckoutByToken = async (token) => {
  const checkout = await db.donationCheckout.findOne({ where: { token: String(token || "") } });
  if (!checkout) return null;
  try {
    await checkCheckout(checkout);
  } catch (err) {
    logger.error(`Checking Stripe checkout ${checkout.id} failed: ${err.message}`);
  }
  return checkoutAnswer(await checkout.reload());
};

/** Ask Stripe about a Processing donation; emails once when it succeeds. */
export const refreshProcessingDonation = async (donation) => {
  const checkout = await db.donationCheckout.findOne({ where: { tripDonationId: donation.id } });
  const trip = await db.trip.findByPk(donation.tripId, { attributes: ["id", "orgId"] });
  const org = await loadStripeOrganization(trip.orgId);
  const key = savedKey(org, checkout ? checkout.stripeTestMode : !!org?.testMode);
  if (!key) throw new Error("The organization has no Stripe key for this donation's mode.");
  const { paymentStatus, ...details } = paymentFields(
    await retrievePaymentIntent(key, donation.stripePaymentIntentId)
  );
  if (paymentStatus === "processing") {
    await db.tripDonation.update(details, { where: { id: donation.id } });
    return;
  }
  const [changed] = await db.tripDonation.update(
    { ...details, paymentStatus, paymentStatusUpdatedAt: new Date() },
    { where: { id: donation.id, paymentStatus: "processing" } }
  );
  if (changed && paymentStatus === "succeeded") {
    await sendCountedDonationEmails(await db.tripDonation.findByPk(donation.id), {
      donorEntered: checkout != null && checkout.donorId == null,
    });
  }
};

/** Check recent pending checkouts and Processing donations; expire old checkouts. One failure doesn't stop the rest. */
export const runStripeChecks = async () => {
  const cutoff = new Date(Date.now() - CHECKOUT_LIFETIME_MS);
  const pending = await db.donationCheckout.findAll({
    where: { status: "pending", createdAt: { [Op.gte]: cutoff } },
  });
  for (const checkout of pending) {
    try {
      await checkCheckout(checkout);
    } catch (err) {
      logger.error(`Checking Stripe checkout ${checkout.id} failed: ${err.message}`);
    }
  }
  await db.donationCheckout.update(
    { status: "expired" },
    { where: { status: "pending", createdAt: { [Op.lt]: cutoff } } }
  );
  const processing = await db.tripDonation.findAll({
    where: { paymentStatus: "processing", stripePaymentIntentId: { [Op.ne]: null } },
  });
  for (const donation of processing) {
    try {
      await refreshProcessingDonation(donation);
    } catch (err) {
      logger.error(`Checking Stripe donation ${donation.id} failed: ${err.message}`);
    }
  }
};

let checkTimer = null;

export const startStripeChecks = () => {
  if (checkTimer) return;
  checkTimer = setInterval(() => {
    runStripeChecks().catch((err) => logger.error(`Stripe donation checks failed: ${err.message}`));
  }, STRIPE_CHECK_INTERVAL_MS);
  checkTimer.unref?.();
};
