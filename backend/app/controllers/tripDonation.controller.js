import db from "../models/index.js";
import { isTripParticipantForTrip } from "../authorization/accessControl.js";
import { optimisticUpdate } from "../utils/optimisticUpdate.js";
import { normalizeEmail } from "../utils/userPerson.js";
import { donorNameFields } from "../utils/donorName.js";
import { sendCountedDonationEmails } from "../utils/eventEmails.js";
import {
  canManageDonations,
  findDonatablePerson,
  isDonationRecipient,
} from "../utils/donorPerson.js";
import { STRIPE_DONATION_TYPES } from "../models/tripDonation.model.js";
import { donationDateRangeWhere } from "../utils/donationDateRange.js";
import {
  ONLINE_DONATIONS_NOT_SET_UP,
  StripeStartError,
  checkoutInputError,
  loadStripeOrganization,
  onlineDonationsSetUp,
  safeReturnPath,
  startCheckout,
} from "../utils/stripeDonations.js";

const TripDonation = db.tripDonation;
const TripPeopleRole = db.tripPeopleRole;
const Donor = db.donor;
const Op = db.Sequelize.Op;
const fields = ["tripId", "personId", "donorId", "amount", "dateTime", "paymentInfo", "donationType", "checkNumber"];
const STAFF_DONATION_TYPES = ["Check", "Other"];
const USE_PAY_WITH_STRIPE = "Use Pay with Stripe for Stripe-ACH and Stripe-Credit donations.";
const STRIPE_DONATION_LOCKED = "A Stripe donation's amount, date, and type can't be changed.";
const STRIPE_LOCKED_FIELDS = [
  "amount",
  "processingFeeAmount",
  "dateTime",
  "donationType",
  "checkNumber",
  "paymentStatus",
  "paymentStatusUpdatedAt",
  "stripeFailureMessage",
  "stripePaymentMethodType",
  "stripePaymentMethodBrand",
  "stripePaymentMethodLast4",
  "stripeCheckoutSessionId",
  "stripePaymentIntentId",
  "stripeChargeId",
  "stripeReceiptUrl",
  "stripeData",
];
const donorFields = [
  "firstName",
  "lastName",
  "familyName",
  "organizationName",
  "addLine1",
  "addLine2",
  "city",
  "country",
  "state_prov",
  "postalCode",
  "phoneContryCode",
  "phoneNumber",
  "email",
  "status",
  "donorType",
];

const loadDonation = (id) =>
  TripDonation.findByPk(id, {
    include: [
      { model: db.person, as: "participant", attributes: ["id", "firstName", "lastName"] },
      { model: db.donor, as: "donor" },
    ],
  });

const pickDonorPayload = (donor) => {
  const payload = {};
  for (const key of donorFields) {
    if (Object.prototype.hasOwnProperty.call(donor, key)) payload[key] = donor[key];
  }
  if (Object.prototype.hasOwnProperty.call(payload, "email")) payload.email = normalizeEmail(payload.email);
  return payload;
};

const donorByEmail = (orgId, email) =>
  Donor.findOne({
    where: {
      orgId,
      [Op.and]: [db.sequelize.where(db.sequelize.fn("LOWER", db.sequelize.col("email")), email)],
    },
  });

const namePayload = (donorBody, fallbackType) => {
  const payload = pickDonorPayload(donorBody || {});
  const names = donorNameFields(payload, payload.donorType || fallbackType || "individual");
  if (names.error) throw new Error(names.error);
  return { ...payload, ...names };
};

const NAME_MESSAGES = new Set(["Donor first name is required.", "Organization name is required."]);

const upsertDonor = async (donorBody, donorId, orgId) => {
  if (donorId) {
    const existing = await Donor.findOne({ where: { id: donorId, orgId } });
    if (existing) {
      if (donorBody) await existing.update(namePayload(donorBody, existing.donorType));
      return existing;
    }
  }
  const payload = namePayload(donorBody);
  if (payload.email) {
    const existing = await donorByEmail(orgId, payload.email);
    if (existing) {
      await existing.update(payload);
      return existing;
    }
  }
  return Donor.create({ ...payload, orgId });
};

class PersonNotFoundError extends Error {}

/** Staff save with `donor.personId` and no chosen donor: use or create the person's linked donor. */
const linkedDonorForStaffSave = async (req, tripId, donorBody, orgId) => {
  const person = await findDonatablePerson(req, tripId, { id: donorBody.personId });
  if (!person) throw new PersonNotFoundError("Person not found.");
  const payload = namePayload(donorBody, "individual");
  const existing = await Donor.findOne({ where: { personId: person.id, orgId } });
  if (existing) {
    await existing.update(payload);
    return existing;
  }
  if (payload.email) {
    const byEmail = await donorByEmail(orgId, payload.email);
    if (byEmail) {
      if (!byEmail.personId) await byEmail.update({ ...payload, personId: person.id });
      else await byEmail.update(payload);
      return byEmail;
    }
  }
  return Donor.create({ ...payload, personId: person.id, orgId });
};

/** Approved participant or any active application assignment for this trip. */
const hasTripAssignment = async (req, tripId) => {
  if (!req.user?.personId) return false;
  if (isTripParticipantForTrip(req, tripId)) return true;
  const link = await TripPeopleRole.findOne({
    where: {
      tripId,
      peopleId: req.user.personId,
      status: { [Op.in]: ["incomplete", "pre_approved", "approved"] },
    },
    attributes: ["id"],
  });
  return !!link;
};

const canViewDonations = async (req, tripId) => {
  if (await canManageDonations(req, tripId)) return true;
  return hasTripAssignment(req, tripId);
};

/**
 * Type and check number for a staff Check or Other save; `current` is the donation being edited.
 * Returns `{ values }` or `{ message }`.
 */
const staffTypeValues = (body, current = null) => {
  const donationType = body.donationType ?? current?.donationType ?? "Other";
  if (STRIPE_DONATION_TYPES.includes(donationType)) return { message: USE_PAY_WITH_STRIPE };
  if (!STAFF_DONATION_TYPES.includes(donationType)) return { message: "Choose a donation type." };
  if (donationType === "Other") return { values: { donationType, checkNumber: null } };
  const raw = Object.prototype.hasOwnProperty.call(body, "checkNumber") ? body.checkNumber : current?.checkNumber;
  const checkNumber = String(raw ?? "").trim();
  if (!checkNumber) return { message: "Check number is required." };
  return { values: { donationType, checkNumber: checkNumber.slice(0, 50) } };
};

const sameValue = (key, next, current) => {
  if (key === "amount") return Number(next) === Number(current);
  if (key === "dateTime") return new Date(next).getTime() === new Date(current).getTime();
  return (next ?? null) === (current ?? null) || String(next ?? "") === String(current ?? "");
};

const changesStripeFields = (body, row) =>
  STRIPE_LOCKED_FIELDS.some(
    (key) => Object.prototype.hasOwnProperty.call(body, key) && !sameValue(key, body[key], row[key])
  );

const pickDonationFields = (body) => {
  const picked = {};
  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) picked[key] = body[key];
  }
  return picked;
};

const tripOrgId = async (tripId) =>
  (await db.trip.findByPk(tripId, { attributes: ["orgId"] }))?.orgId ?? null;

/** Donor for a staff save: the chosen donor, the person's linked donor, or one found or created from the details. */
const staffDonor = async (req, tripId, donor, donorId) => {
  const orgId = await tripOrgId(tripId);
  return donor?.personId && !donorId
    ? linkedDonorForStaffSave(req, tripId, donor, orgId)
    : upsertDonor(donor, donorId, orgId);
};

const sendCheckout = async (res, checkoutOptions) => {
  try {
    res.send(await startCheckout(checkoutOptions));
  } catch (err) {
    if (err instanceof StripeStartError) return res.status(502).send({ message: err.message });
    throw err;
  }
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const tripId = req.query.tripId;
    if (!tripId) return res.status(400).send({ message: "tripId query param required." });
    if (!(await canViewDonations(req, tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const where = { tripId, ...donationDateRangeWhere(req.query.startDate, req.query.endDate) };
    const canManage = await canManageDonations(req, tripId);
    const personIdRaw = req.query.personId;
    if (canManage && personIdRaw != null && personIdRaw !== "") {
      const personId = parseInt(personIdRaw, 10);
      if (Number.isNaN(personId)) {
        return res.status(400).send({ message: "Invalid personId." });
      }
      where.personId = personId;
    } else if (!canManage) {
      // Participants and applicants only see their own donations.
      where.personId = req.user.personId;
    }
    const data = await TripDonation.findAll({
      where,
      include: [
        { model: db.person, as: "participant", attributes: ["id", "firstName", "lastName"] },
        { model: db.donor, as: "donor" },
      ],
      order: [["dateTime", "DESC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (!(await canManageDonations(req, req.body.tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const { donor, donorId, ...body } = req.body;
    const type = staffTypeValues(body);
    if (type.message) return res.status(400).send({ message: type.message });
    const donorRecord = await staffDonor(req, req.body.tripId, donor, donorId);
    const data = await TripDonation.create({
      ...pickDonationFields(body),
      ...type.values,
      donorId: donorRecord?.id ?? null,
    });
    await sendCountedDonationEmails(data);
    res.send(await loadDonation(data.id));
  } catch (err) {
    if (err instanceof PersonNotFoundError || NAME_MESSAGES.has(err.message)) {
      return res.status(400).send({ message: err.message });
    }
    res.status(500).send({ message: err.message });
  }
};

/** Staff take a Stripe-ACH or Stripe-Credit payment for a donation on the trip. */
exports.createStaffCheckout = async (req, res) => {
  try {
    const { tripId, personId, amount, paymentMethod, donor, donorId, paymentInfo, returnPath } = req.body;
    if (!(await canManageDonations(req, tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const inputError = checkoutInputError({ amount, paymentMethod });
    if (inputError) return res.status(400).send({ message: inputError });
    if (!donorId) {
      const names = donorNameFields(donor, donor?.donorType || "individual");
      if (names.error) return res.status(400).send({ message: names.error });
    }
    let participant = null;
    if (personId != null && personId !== "") {
      const onTrip = await TripPeopleRole.findOne({ where: { tripId, peopleId: personId }, attributes: ["id"] });
      if (!onTrip) return res.status(400).send({ message: "Choose a participant on this trip." });
      participant = await db.person.findByPk(personId, { attributes: ["id", "firstName", "lastName"] });
    }
    const trip = await db.trip.findByPk(tripId, { attributes: ["id", "name", "orgId"] });
    const org = await loadStripeOrganization(trip.orgId);
    if (!onlineDonationsSetUp(org)) return res.status(400).send({ message: ONLINE_DONATIONS_NOT_SET_UP });
    const donorRecord = await staffDonor(req, tripId, donor, donorId);
    if (!donorRecord) return res.status(400).send({ message: "Donor not found." });
    await sendCheckout(res, {
      trip,
      org,
      participant,
      amount,
      paymentMethod,
      returnPath: safeReturnPath(returnPath ?? "/donations", trip),
      fields: { donorId: donorRecord.id, paymentInfo: paymentInfo?.trim() || null },
      donorDisplay: donorRecord,
    });
  } catch (err) {
    if (err instanceof PersonNotFoundError) return res.status(400).send({ message: err.message });
    res.status(500).send({ message: err.message });
  }
};

/** A person with an application on the trip pays toward an approved member (or themselves) with Stripe. */
exports.createParticipantCheckout = async (req, res) => {
  try {
    const { tripId, personId, amount, paymentMethod, returnPath } = req.body;
    if (!(await hasTripAssignment(req, tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const inputError = checkoutInputError({ amount, paymentMethod });
    if (inputError) return res.status(400).send({ message: inputError });
    const recipientId = Number(personId);
    const recipientAllowed = recipientId ? await isDonationRecipient(tripId, recipientId) : false;
    if (recipientId === Number(req.user.personId) && !recipientAllowed) {
      return res.status(403).send({
        message: "You can donate to yourself only on trips where you are pre-approved or approved.",
      });
    }
    if (!recipientAllowed) {
      return res.status(400).send({ message: "Choose a participant on this trip." });
    }
    const trip = await db.trip.findByPk(tripId, { attributes: ["id", "name", "orgId"] });
    const org = await loadStripeOrganization(trip.orgId);
    if (!onlineDonationsSetUp(org)) return res.status(400).send({ message: ONLINE_DONATIONS_NOT_SET_UP });
    const personAttributes = ["id", "firstName", "lastName", "email"];
    await sendCheckout(res, {
      trip,
      org,
      participant: await db.person.findByPk(recipientId, { attributes: personAttributes }),
      amount,
      paymentMethod,
      returnPath: safeReturnPath(returnPath, trip),
      fields: { giverPersonId: req.user.personId },
      donorDisplay: await db.person.findByPk(req.user.personId, { attributes: personAttributes }),
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await TripDonation.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Donation not found." });
    if (!(await canManageDonations(req, row.tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const { donor, donorId, ...body } = req.body;
    const donationBody = pickDonationFields(body);
    if (STRIPE_DONATION_TYPES.includes(row.donationType)) {
      if (changesStripeFields(body, row)) return res.status(400).send({ message: STRIPE_DONATION_LOCKED });
      for (const key of STRIPE_LOCKED_FIELDS) delete donationBody[key];
    } else {
      const type = staffTypeValues(body, row);
      if (type.message) return res.status(400).send({ message: type.message });
      Object.assign(donationBody, type.values);
    }
    donationBody.version = body.version;
    if (donor?.personId && !donorId) {
      const donorRecord = await linkedDonorForStaffSave(req, row.tripId, donor, await tripOrgId(row.tripId));
      donationBody.donorId = donorRecord.id;
    } else if (donor || donorId) {
      await upsertDonor(donor, donorId || row.donorId, await tripOrgId(row.tripId));
    }
    const result = await optimisticUpdate(TripDonation, req.params.id, donationBody, fields);
    if (!result.ok) return res.status(result.status).send({ message: result.message });
    res.send(await loadDonation(req.params.id));
  } catch (err) {
    if (err instanceof PersonNotFoundError || NAME_MESSAGES.has(err.message)) {
      return res.status(400).send({ message: err.message });
    }
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const row = await TripDonation.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Donation not found." });
    if (!(await canManageDonations(req, row.tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    await TripDonation.destroy({ where: { id: req.params.id } });
    res.send({ message: "Deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
