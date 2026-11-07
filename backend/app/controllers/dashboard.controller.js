import db from "../models/index.js";
import {
  canAccessOrg,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
  isTripParticipantForTrip,
  ROLE_TRIP_LEADER,
  ROLE_TRIP_PARTICIPANT,
} from "../authorization/accessControl.js";
import { tripRoleAvailability, withCapacityFields } from "../utils/tripRoleCapacity.js";
import { DONATION_STATUSES, isDonationRecipient } from "../utils/donorPerson.js";
import { countedDonations } from "../utils/donationCounting.js";
import { toUrlSlug } from "../utils/urlSlug.js";
import {
  ONLINE_DONATIONS_NOT_SET_UP,
  StripeStartError,
  checkCheckoutByToken,
  checkoutInputError,
  loadStripeOrganization,
  onlineDonationsSetUp,
  safeReturnPath,
  startCheckout,
  tripOnlineDonations,
} from "../utils/stripeDonations.js";

const Trip = db.trip;
const TripPeopleRole = db.tripPeopleRole;
const TripDonation = db.tripDonation;
const OrgPeopleRole = db.orgPeopleRole;
const Role = db.role;

const personDisplaySlug = (person) =>
  toUrlSlug(`${person?.firstName || ""} ${person?.lastName || ""}`.trim());

const orgInclude = {
  model: db.organization,
  as: "organization",
  attributes: ["id", "name", "logo", "colorFamily", "websiteUrl"],
};

const findActiveTripBySlug = async (tripSlug) => {
  const trips = await Trip.findAll({
    where: { status: "active" },
    include: [orgInclude],
  });
  return trips.find((t) => toUrlSlug(t.name) === tripSlug) || null;
};

const findActiveTripById = async (tripId) =>
  Trip.findByPk(tripId, { include: [orgInclude] });

const donorFacingRoles = async () => {
  const roles = await Role.findAll({
    where: { roleName: { [db.Sequelize.Op.in]: [ROLE_TRIP_PARTICIPANT, ROLE_TRIP_LEADER] } },
  });
  return roles.map((r) => r.id);
};

const loadTripParticipants = async (tripId, roleIds) =>
  TripPeopleRole.findAll({
    where: {
      tripId,
      roleId: { [db.Sequelize.Op.in]: roleIds },
      status: { [db.Sequelize.Op.in]: DONATION_STATUSES },
    },
    include: [{ model: db.person, as: "person", attributes: ["id", "firstName", "lastName", "bioText", "picture"] }],
  });

const findTripMember = async (tripId, peopleId, roleIds) =>
  TripPeopleRole.findOne({
    where: {
      tripId,
      peopleId,
      roleId: { [db.Sequelize.Op.in]: roleIds },
      status: { [db.Sequelize.Op.in]: DONATION_STATUSES },
    },
    include: [{ model: db.person, as: "person" }],
  });

const sendTripPayload = async (res, trip) => {
  const roleIds = await donorFacingRoles();
  const participants = await loadTripParticipants(trip.id, roleIds);
  res.send({ trip, participants, onlineDonations: await tripOnlineDonations(trip) });
};

const sendParticipantPayload = async (res, trip, link) => {
  const personId = link.peopleId || link.person?.id;
  const donationTotal =
    (await TripDonation.sum("amount", { where: countedDonations({ tripId: trip.id, personId }) })) || 0;
  res.send({
    trip,
    participant: link.person,
    whygoText: link.whygoText,
    donationTotal,
    onlineDonations: await tripOnlineDonations(trip),
  });
};

const exports = {};

exports.orgDashboard = async (req, res) => {
  try {
    const orgId = req.query.orgId;
    if (!orgId || !canAccessOrg(req, orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    if (!isOrgAdminForOrg(req, orgId) && !isSystemAdmin(req)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const trips = await Trip.findAll({ where: { orgId } });
    const peopleCount = await OrgPeopleRole.count({ where: { orgId } });
    const tripIds = trips.map((t) => t.id);
    const donationTotal =
      tripIds.length === 0
        ? 0
        : await TripDonation.sum("amount", { where: countedDonations({ tripId: tripIds }) });
    res.send({
      orgId: Number(orgId),
      tripCount: trips.length,
      activeTrips: trips.filter((t) => t.status === "active").length,
      peopleCount,
      donationTotal: donationTotal || 0,
      trips,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.tripDashboard = async (req, res) => {
  try {
    const tripId = req.query.tripId;
    const trip = await Trip.findByPk(tripId);
    if (!trip) return res.status(404).send({ message: "Trip not found." });

    const isLeader = isTripLeaderForTrip(req, tripId);
    const isParticipant = isTripParticipantForTrip(req, tripId);
    const isOrgAdmin = isOrgAdminForOrg(req, trip.orgId);

    if (!isLeader && !isParticipant && !isOrgAdmin && !isSystemAdmin(req)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const participants = await TripPeopleRole.count({ where: { tripId } });
    const donationTotal = (await TripDonation.sum("amount", { where: countedDonations({ tripId }) })) || 0;
    const donationCount = await TripDonation.count({ where: { tripId } });

    res.send({
      trip,
      participants,
      donationTotal,
      donationCount,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.participantDashboard = async (req, res) => {
  try {
    const tripId = req.query.tripId;
    if (!isTripParticipantForTrip(req, tripId)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const personId = req.user.personId;
    const donationTotal =
      (await TripDonation.sum("amount", { where: countedDonations({ tripId, personId }) })) || 0;
    const donationCount = await TripDonation.count({ where: { tripId, personId } });
    const trip = await Trip.findByPk(tripId);
    res.send({ trip, donationTotal, donationCount, personId });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getTripForDonor = async (req, res) => {
  try {
    const trip = await findActiveTripById(req.params.tripId);
    if (!trip || trip.status !== "active") {
      return res.status(404).send({ message: "Trip not found." });
    }
    await sendTripPayload(res, trip);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getTripForDonorBySlug = async (req, res) => {
  try {
    const trip = await findActiveTripBySlug(req.params.tripSlug);
    if (!trip) {
      return res.status(404).send({ message: "Trip not found." });
    }
    await sendTripPayload(res, trip);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getParticipantForDonor = async (req, res) => {
  try {
    const { tripId, personId } = req.params;
    const trip = await findActiveTripById(tripId);
    if (!trip || trip.status !== "active") {
      return res.status(404).send({ message: "Trip not found." });
    }
    const roleIds = await donorFacingRoles();
    const link = await findTripMember(trip.id, personId, roleIds);
    if (!link) return res.status(404).send({ message: "Participant not found." });
    await sendParticipantPayload(res, trip, link);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getParticipantForDonorBySlug = async (req, res) => {
  try {
    const { tripSlug, personSlug } = req.params;
    const trip = await findActiveTripBySlug(tripSlug);
    if (!trip) {
      return res.status(404).send({ message: "Trip not found." });
    }
    const roleIds = await donorFacingRoles();
    const members = await loadTripParticipants(trip.id, roleIds);
    const link = members.find((row) => personDisplaySlug(row.person) === personSlug);
    if (!link) return res.status(404).send({ message: "Participant not found." });
    await sendParticipantPayload(res, trip, link);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.createPublicCheckout = async (req, res) => {
  try {
    const { tripId, personId, donor, amount, paymentMethod, returnPath } = req.body;
    const trip = await Trip.findByPk(tripId, { attributes: ["id", "name", "orgId", "status"] });
    if (!trip || trip.status !== "active") {
      return res.status(404).send({ message: "Trip not found." });
    }
    const inputError = checkoutInputError({ amount, paymentMethod });
    if (inputError) return res.status(400).send({ message: inputError });
    const firstName = String(donor?.firstName ?? "").trim();
    const email = String(donor?.email ?? "").trim();
    if (!firstName || !email) {
      return res.status(400).send({ message: "Your first name and email are required." });
    }
    const signedInPersonId = req.user?.personId ?? null;
    let participant = null;
    if (personId != null && personId !== "") {
      if (
        signedInPersonId &&
        Number(personId) === Number(signedInPersonId) &&
        !(await isDonationRecipient(trip.id, signedInPersonId))
      ) {
        return res.status(403).send({
          message: "You can donate to yourself only on trips where you are pre-approved or approved.",
        });
      }
      const link = await findTripMember(trip.id, personId, await donorFacingRoles());
      if (!link) return res.status(400).send({ message: "Choose a participant on this trip." });
      participant = link.person;
    }
    const org = await loadStripeOrganization(trip.orgId);
    if (!onlineDonationsSetUp(org)) return res.status(400).send({ message: ONLINE_DONATIONS_NOT_SET_UP });
    const lastName = String(donor?.lastName ?? "").trim() || null;
    res.send(
      await startCheckout({
        trip,
        org,
        participant,
        amount,
        paymentMethod,
        returnPath: safeReturnPath(returnPath, trip),
        fields: { giverPersonId: signedInPersonId, donorFirstName: firstName, donorLastName: lastName, donorEmail: email },
        donorDisplay: { firstName, lastName, email },
      })
    );
  } catch (err) {
    if (err instanceof StripeStartError) return res.status(502).send({ message: err.message });
    res.status(500).send({ message: err.message });
  }
};

exports.checkCheckout = async (req, res) => {
  try {
    const answer = await checkCheckoutByToken(req.params.token);
    if (!answer) return res.status(404).send({ message: "Donation not found." });
    res.send(answer);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const todayDateOnly = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

exports.getOrgTripsBySlug = async (req, res) => {
  try {
    const orgSlug = req.params.orgSlug;
    const orgs = await db.organization.findAll({
      attributes: ["id", "name", "logo", "colorFamily", "websiteUrl", "city", "state_prov", "country"],
    });
    const organization = orgs.find((o) => toUrlSlug(o.name) === orgSlug) || null;
    if (!organization) {
      return res.status(404).send({ message: "Organization not found." });
    }

    const today = todayDateOnly();
    const trips = await Trip.findAll({
      where: { orgId: organization.id, status: "active" },
      attributes: [
        "id",
        "orgId",
        "name",
        "location",
        "city",
        "country",
        "startDate",
        "endDate",
        "status",
        "image",
        "description",
      ],
      order: [
        ["startDate", "ASC"],
        ["name", "ASC"],
      ],
    });

    const openTrips = trips.filter((t) => !t.endDate || String(t.endDate) >= today);
    const tripsWithAvailability = await Promise.all(
      openTrips.map(async (trip) => ({
        ...trip.toJSON(),
        roleAvailability: await tripRoleAvailability(trip.id),
      }))
    );

    res.send({ organization, trips: tripsWithAvailability });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const loadPublicTripRolesNeeded = async (tripId) => {
  const rows = await db.tripWorkerRole.findAll({
    where: { tripId },
    include: [
      {
        model: db.workerRole,
        as: "workerRole",
        attributes: ["id", "name", "description"],
      },
    ],
    order: [[{ model: db.workerRole, as: "workerRole" }, "name", "ASC"]],
  });

  const enriched = await withCapacityFields(tripId, rows);
  return enriched.map((json) => ({
    id: json.id,
    quantity: Number(json.quantity) || 0,
    signedUpCount: json.signedUpCount || 0,
    reservedCount: json.reservedCount || 0,
    availableCount: json.availableCount || 0,
    workerRole: json.workerRole
      ? {
          id: json.workerRole.id,
          name: json.workerRole.name,
          description: json.workerRole.description,
        }
      : null,
  }));
};

exports.getTripOverviewBySlug = async (req, res) => {
  try {
    const trip = await findActiveTripBySlug(req.params.tripSlug);
    if (!trip) {
      return res.status(404).send({ message: "Trip not found." });
    }
    const rolesNeeded = await loadPublicTripRolesNeeded(trip.id);
    res.send({ trip, rolesNeeded });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
