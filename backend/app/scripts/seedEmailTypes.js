import "dotenv/config";
import { pathToFileURL } from "url";
import db from "../models/index.js";

const SENT_FROM_EMAIL_TEAM =
  "This email is not sent automatically. Trip staff send it to the trip team from Email team on the trip page.";

const DONOR_NOT_SENT =
  "This email is not sent automatically. Org Admins send it from Email on the Donors page.";

export const DONOR_THANK_YOU_EMAIL_TYPE = {
  typeCode: "donor-thank-you",
  description: "Thank you for donation",
  eventCode: "donor-thank-you",
  eventDescription:
    "This event happens when a donor enters a donation and it starts counting: a public donation page, Home Donate, or My Trip Make Donation. The email goes to the donor. Staff Add donation and staff Pay with Stripe do not send it.",
};

export const TRIP_DONATION_EMAIL_TYPE = {
  typeCode: "trip-donation",
  description: "Trip donation",
  eventCode: "trip-donation",
  eventDescription:
    "This event happens when a donation starts counting toward a trip: a Check or Other donation is added, or a Stripe payment succeeds. The email goes to the participant and to the donor, each address once.",
};

const emailTypes = [
  {
    typeCode: "apply-started",
    description: "Application started",
    eventCode: "application-started",
    eventDescription:
      "This event happens when a Trip Participant's application is saved for the first time and is still incomplete.",
  },
  {
    typeCode: "apply-incomplete",
    description: "Application incomplete reminder",
    eventCode: "application-incomplete",
    eventDescription: "This scheduled rule checks whether the Trip Participant's application is still Incomplete.",
  },
  {
    typeCode: "apply-received",
    description: "Application received",
    eventCode: "application-submitted",
    eventDescription:
      "This event happens when a Trip Participant's application becomes Pre-Approved: when an incomplete application is completed, or when the first save is already complete.",
  },
  {
    typeCode: "apply-approved",
    description: "Application approved",
    eventCode: "application-approved",
    eventDescription:
      "This event happens when a Trip Participant's application is changed to Approved, or is added as Approved.",
  },
  {
    typeCode: "documents-missing",
    description: "Documents missing reminder",
    eventCode: "documents-missing",
    eventDescription:
      "This scheduled rule checks whether the Trip Participant's application is Pre-Approved and at least one trip document is still missing, has no file, or has an expiration date that doesn't meet its document type's expiration check.",
  },
  {
    typeCode: "document-reload",
    description: "Document reload requested",
    eventCode: "document-reload-requested",
    eventDescription:
      "This event happens when trip staff click Request reload on a document in Review documents. The email goes to the person whose document it is.",
  },
  {
    typeCode: "deposit-due",
    description: "Deposit due",
    eventCode: "deposit-due",
    eventDescription:
      "This scheduled rule checks whether the Trip Participant's application is Approved, the trip has a deposit above $0, and the donations recorded for them on the trip total less than the deposit.",
  },
  {
    typeCode: "deposit-received",
    description: "Deposit received",
    eventCode: "deposit-received",
    eventDescription:
      "This event happens the first time the donations recorded for a Trip Participant on a trip reach or exceed the trip deposit amount.",
  },
  {
    typeCode: "payment-due",
    description: "Payment due reminder",
    eventCode: "payment-due",
    eventDescription:
      "This scheduled rule checks whether the Trip Participant's application is Approved and they still have a balance above $0 for the trip (total trip cost minus donations).",
  },
  {
    typeCode: "payment-complete",
    description: "Trip fully paid",
    eventCode: "payment-complete",
    eventDescription:
      "This event happens when a donation brings a Trip Participant's balance for the trip to $0 or less.",
  },
  {
    typeCode: "donation-received",
    description: "Donation received",
    eventCode: "donation-received",
    eventDescription: "This event happens each time a donation is recorded for a Trip Participant on a trip.",
  },
  {
    typeCode: "pre-departure",
    description: "Pre-departure information",
    eventCode: "pre-departure",
    eventDescription: "This scheduled rule checks whether the Trip Participant's application is Approved.",
  },
  {
    typeCode: "team-update",
    description: "Trip team update",
    eventCode: "team-email",
    eventDescription: SENT_FROM_EMAIL_TEAM,
  },
  {
    typeCode: "financial-statement",
    description: "Trip financial statement",
    eventCode: "team-email",
    eventDescription: SENT_FROM_EMAIL_TEAM,
  },
  {
    typeCode: "people-update",
    description: "People update",
    eventCode: "team-email",
    eventDescription: "This email is not sent automatically. Org Admins send it from Email on the People page.",
  },
  {
    typeCode: "donor-update",
    description: "Donor update",
    eventCode: "team-email",
    eventDescription: DONOR_NOT_SENT,
  },
  {
    typeCode: "annual-donation",
    description: "Annual donation",
    eventCode: "team-email",
    eventDescription: DONOR_NOT_SENT,
  },
  DONOR_THANK_YOU_EMAIL_TYPE,
  {
    typeCode: "trip-arrival",
    description: "Trip arrival info",
    eventCode: "team-email",
    eventDescription: SENT_FROM_EMAIL_TEAM,
  },
  {
    typeCode: "account-invite",
    description: "Account invitation",
    eventCode: "team-email",
    eventDescription: SENT_FROM_EMAIL_TEAM,
  },
  {
    typeCode: "flight-itinerary",
    description: "Flight itinerary",
    eventCode: "team-email",
    eventDescription:
      "This email is not sent automatically. Trip staff and Agents send it from Email flight itinerary on the trip's Flights page.",
  },
  {
    typeCode: "trip-arrival-scheduled",
    description: "Trip arrival info (scheduled)",
    eventCode: "trip-arrival",
    eventDescription: "This scheduled rule checks whether the Trip Participant's application is Approved.",
  },
  TRIP_DONATION_EMAIL_TYPE,
];

/**
 * Add each seed email type that is missing, and fill `eventDescription` on existing seeded types
 * where it is blank. Returns how many types were inserted and how many descriptions were filled.
 */
export const seedEmailTypesWithCounts = async () => {
  let inserted = 0;
  let filled = 0;
  for (const { typeCode, description, eventCode, eventDescription } of emailTypes) {
    const [row, created] = await db.emailType.findOrCreate({
      where: { typeCode },
      defaults: { description, eventCode, eventDescription },
    });
    if (created) {
      inserted += 1;
    } else if (!String(row.eventDescription || "").trim()) {
      await row.update({ eventDescription });
      filled += 1;
    }
  }
  return { inserted, filled };
};

/** Add each seed email type that is missing. Returns how many were inserted. */
export const seedEmailTypes = async () => (await seedEmailTypesWithCounts()).inserted;

const run = async () => {
  try {
    await db.sequelize.authenticate();
    await db.emailType.sync();
    const { inserted, filled } = await seedEmailTypesWithCounts();
    console.log(
      `Email types: ${emailTypes.length} in seed list, ${emailTypes.length - inserted} already present, ${inserted} inserted, ${filled} event descriptions filled.`
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) run();
