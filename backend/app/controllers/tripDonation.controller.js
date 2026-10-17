import db from "../models/index.js";
import { isTripParticipantForTrip } from "../authorization/accessControl.js";
import { optimisticUpdate } from "../utils/optimisticUpdate.js";
import { normalizeEmail } from "../utils/userPerson.js";
import { sendDonationEventEmails } from "../utils/eventEmails.js";
import {
  canManageDonations,
  findDonatablePerson,
  findOrCreateLinkedDonor,
  isApprovedTripMember,
} from "../utils/donorPerson.js";

const TripDonation = db.tripDonation;
const TripPeopleRole = db.tripPeopleRole;
const Donor = db.donor;
const Op = db.Sequelize.Op;
const fields = ["tripId", "personId", "donorId", "amount", "dateTime", "paymentInfo"];
const donorFields = [
  "firstName",
  "lastName",
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
  if (payload.email) payload.email = normalizeEmail(payload.email);
  return payload;
};

const upsertDonor = async (donorBody, donorId) => {
  if (donorId) {
    const existing = await Donor.findByPk(donorId);
    if (!existing) return null;
    if (donorBody) await existing.update(pickDonorPayload(donorBody));
    return existing;
  }
  if (!donorBody?.firstName?.trim()) {
    throw new Error("Donor first name is required.");
  }
  const payload = pickDonorPayload(donorBody);
  if (payload.email) {
    const existing = await Donor.findOne({
      where: db.sequelize.where(db.sequelize.fn("LOWER", db.sequelize.col("email")), payload.email),
    });
    if (existing) {
      await existing.update(payload);
      return existing;
    }
  }
  return Donor.create(payload);
};

class PersonNotFoundError extends Error {}

/** Staff save with `donor.personId` and no chosen donor: use or create the person's linked donor. */
const linkedDonorForStaffSave = async (req, tripId, donorBody) => {
  const person = await findDonatablePerson(req, tripId, { id: donorBody.personId });
  if (!person) throw new PersonNotFoundError("Person not found.");
  const payload = pickDonorPayload(donorBody);
  const existing = await Donor.findOne({ where: { personId: person.id } });
  if (existing) {
    await existing.update(payload);
    return existing;
  }
  return Donor.create({ ...payload, personId: person.id });
};

/** Approved participant or any active application assignment for this trip. */
const hasTripAssignment = async (req, tripId) => {
  if (!req.user?.personId) return false;
  if (isTripParticipantForTrip(req, tripId)) return true;
  const link = await TripPeopleRole.findOne({
    where: {
      tripId,
      peopleId: req.user.personId,
      status: { [Op.in]: ["incomplete", "applied", "approved"] },
    },
    attributes: ["id"],
  });
  return !!link;
};

const canViewDonations = async (req, tripId) => {
  if (await canManageDonations(req, tripId)) return true;
  return hasTripAssignment(req, tripId);
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const tripId = req.query.tripId;
    if (!tripId) return res.status(400).send({ message: "tripId query param required." });
    if (!(await canViewDonations(req, tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const where = { tripId };
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
    const { donor, donorId, ...donationBody } = req.body;
    const donorRecord =
      donor?.personId && !donorId
        ? await linkedDonorForStaffSave(req, req.body.tripId, donor)
        : await upsertDonor(donor, donorId);
    const data = await TripDonation.create({
      ...donationBody,
      donorId: donorRecord?.id ?? null,
    });
    await sendDonationEventEmails(data);
    res.send(await loadDonation(data.id));
  } catch (err) {
    if (err instanceof PersonNotFoundError) return res.status(400).send({ message: err.message });
    res.status(500).send({ message: err.message });
  }
};

/** A person with an application on the trip donates toward an approved member (or themselves). */
exports.createByParticipant = async (req, res) => {
  try {
    const { tripId, personId, amount, paymentInfo } = req.body;
    if (!(await hasTripAssignment(req, tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const parsedAmount = Number(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).send({ message: "Donation amount is required." });
    }
    const recipientId = Number(personId);
    const recipientApproved = recipientId ? await isApprovedTripMember(tripId, recipientId) : false;
    if (recipientId === Number(req.user.personId) && !recipientApproved) {
      return res
        .status(403)
        .send({ message: "You can donate to yourself only on trips where you are approved." });
    }
    if (!recipientApproved) {
      return res.status(400).send({ message: "Choose a participant on this trip." });
    }
    const donorRecord = await findOrCreateLinkedDonor(req.user.personId);
    const data = await TripDonation.create({
      tripId,
      personId: recipientId,
      donorId: donorRecord.id,
      amount: parsedAmount,
      dateTime: new Date(),
      paymentInfo: paymentInfo?.trim() || null,
    });
    await sendDonationEventEmails(data);
    res.send(await loadDonation(data.id));
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
    const { donor, donorId, ...donationBody } = req.body;
    if (donor?.personId && !donorId) {
      const donorRecord = await linkedDonorForStaffSave(req, row.tripId, donor);
      donationBody.donorId = donorRecord.id;
    } else if (donor || donorId) {
      await upsertDonor(donor, donorId || row.donorId);
    }
    const result = await optimisticUpdate(TripDonation, req.params.id, donationBody, fields);
    if (!result.ok) return res.status(result.status).send({ message: result.message });
    res.send(await loadDonation(req.params.id));
  } catch (err) {
    if (err instanceof PersonNotFoundError) return res.status(400).send({ message: err.message });
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
