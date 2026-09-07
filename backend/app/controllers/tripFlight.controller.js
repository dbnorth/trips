import db from "../models/index.js";
import {
  canAccessTrip,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
} from "../authorization/accessControl.js";
import { flightPurchaseInclude } from "../utils/flightPurchaseFields.js";

const Trip = db.trip;
const TripPeopleRole = db.tripPeopleRole;
const TripFlight = db.tripFlight;
const TripFlightSegment = db.tripFlightSegment;
const Airport = db.airport;
const Airline = db.airline;
const Op = db.Sequelize.Op;

const ELIGIBLE_STATUSES = ["incomplete", "applied", "approved"];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HHMM = /^\d{2}:\d{2}$/;

const exports = {};

const canManageTripFlights = async (req, tripId) => {
  const access = await canAccessTrip(req, tripId);
  if (!access.ok) return { ok: false, status: 404, trip: null };
  if (isOrgAdminForOrg(req, access.trip.orgId) || isSystemAdmin(req)) {
    return { ok: true, trip: access.trip };
  }
  if (isTripLeaderForTrip(req, tripId)) {
    return { ok: true, trip: access.trip };
  }
  return { ok: false, status: 403, trip: access.trip };
};

const forbid = (res, manage) =>
  res.status(manage.status).send({
    message: manage.status === 404 ? "Trip not found." : "Forbidden.",
  });

const formatTime = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (TIME_HHMM.test(s)) return s;
  // MySQL TIME sometimes returns HH:MM:SS
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
  return s;
};

const compareDateTime = (dateA, timeA, dateB, timeB) => {
  const a = `${dateA}T${timeA}:00`;
  const b = `${dateB}T${timeB}:00`;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const segmentIncludes = [
  { model: Airport, as: "departureAirport", attributes: ["id", "code", "city", "airportName"] },
  { model: Airport, as: "arrivalAirport", attributes: ["id", "code", "city", "airportName"] },
  { model: Airline, as: "airline", attributes: ["id", "code", "name"] },
];

const serializeSegment = (segment) => {
  const json = typeof segment.toJSON === "function" ? segment.toJSON() : segment;
  return {
    id: json.id,
    segmentNumber: json.segmentNumber,
    departureAirportCode: json.departureAirport?.code || null,
    airlineCode: json.airline?.code || null,
    flightNumber: json.flightNumber,
    departureDate: json.departureDate,
    departureTime: formatTime(json.departureTime),
    arrivalAirportCode: json.arrivalAirport?.code || null,
    arrivalDate: json.arrivalDate,
    arrivalTime: formatTime(json.arrivalTime),
    cabinClass: json.cabinClass || "",
    seatNumber: json.seatNumber || "",
  };
};

const deriveItinerary = (segments) => {
  if (!segments?.length) {
    return { initialDeparture: null, finalArrival: null, segmentCount: 0 };
  }
  const ordered = [...segments].sort((a, b) => a.segmentNumber - b.segmentNumber);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const firstJson = typeof first.toJSON === "function" ? first.toJSON() : first;
  const lastJson = typeof last.toJSON === "function" ? last.toJSON() : last;
  return {
    segmentCount: ordered.length,
    initialDeparture: {
      date: firstJson.departureDate,
      time: formatTime(firstJson.departureTime),
      city: firstJson.departureAirport?.city || null,
      airportCode: firstJson.departureAirport?.code || null,
    },
    finalArrival: {
      date: lastJson.arrivalDate,
      time: formatTime(lastJson.arrivalTime),
      city: lastJson.arrivalAirport?.city || null,
      airportCode: lastJson.arrivalAirport?.code || null,
    },
  };
};

const serializeApplicationFlightPurchase = (json) => {
  const option = json.flightPurchaseOption || null;
  const preferences =
    option === "organization"
      ? {
          departureAirportCode: json.preferredDepartureAirport?.code || null,
          departureCity: json.preferredDepartureAirport?.city || null,
          returnAirportCode: json.preferredReturnAirport?.code || null,
          returnCity: json.preferredReturnAirport?.city || null,
          cabinClass: json.preferredCabinClass || null,
          airlineCode: json.preferredAirline?.code || null,
          airlineName: json.preferredAirline?.name || null,
        }
      : null;

  let preferencesText = null;
  if (preferences) {
    const bits = [];
    if (preferences.departureAirportCode) {
      bits.push(
        `Departure ${preferences.departureAirportCode}${
          preferences.departureCity ? ` (${preferences.departureCity})` : ""
        }`
      );
    }
    if (preferences.returnAirportCode) {
      bits.push(
        `Return ${preferences.returnAirportCode}${
          preferences.returnCity ? ` (${preferences.returnCity})` : ""
        }`
      );
    }
    if (preferences.cabinClass) bits.push(`Class ${preferences.cabinClass}`);
    if (preferences.airlineCode || preferences.airlineName) {
      bits.push(
        `Airline ${[preferences.airlineCode, preferences.airlineName].filter(Boolean).join(" — ")}`
      );
    }
    preferencesText = bits.length ? bits.join(" · ") : null;
  }

  return {
    flightPurchaseOption: option,
    flightPurchasePreferences: preferences,
    flightPurchasePreferencesText: preferencesText,
  };
};

const loadEligibleAssignment = async (tripId, tripPeopleRoleId) => {
  return TripPeopleRole.findOne({
    where: {
      id: tripPeopleRoleId,
      tripId,
      status: { [Op.in]: ELIGIBLE_STATUSES },
    },
  });
};

const ensureFlight = async (tripPeopleRoleId, transaction) => {
  let flight = await TripFlight.findOne({ where: { tripPeopleRoleId }, transaction });
  if (!flight) {
    flight = await TripFlight.create(
      { tripPeopleRoleId, purchased: false, cost: null, comments: null },
      { transaction }
    );
  }
  return flight;
};

exports.findFlights = async (req, res) => {
  try {
    // Avoid browsers reusing a stale JSON body after API shape changes.
    res.set("Cache-Control", "no-store");

    const tripId = req.params.id;
    const manage = await canManageTripFlights(req, tripId);
    if (!manage.ok) return forbid(res, manage);

    const trip = await Trip.findByPk(tripId, {
      attributes: ["id", "name", "startDate", "endDate", "orgId"],
      include: [
        {
          model: db.organization,
          as: "organization",
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });
    if (!trip) return res.status(404).send({ message: "Trip not found." });

    const assignments = await TripPeopleRole.findAll({
      where: { tripId, status: { [Op.in]: ELIGIBLE_STATUSES } },
      include: [
        { model: db.person, as: "person", attributes: ["id", "firstName", "lastName"] },
        ...flightPurchaseInclude,
        {
          model: TripFlight,
          as: "flight",
          required: false,
          include: [
            {
              model: TripFlightSegment,
              as: "segments",
              include: segmentIncludes,
            },
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    const tripJson = trip.toJSON();
    const organizationName = tripJson.organization?.name || null;

    const participants = assignments.map((row) => {
      const json = row.toJSON();
      const flight = json.flight || null;
      const segments = flight?.segments || [];
      const itinerary = deriveItinerary(segments);
      const purchase = serializeApplicationFlightPurchase(json);
      return {
        tripPeopleRoleId: json.id,
        peopleId: json.peopleId,
        firstName: json.person?.firstName || "",
        lastName: json.person?.lastName || "",
        purchased: flight ? !!flight.purchased : false,
        cost: flight?.cost != null ? Number(flight.cost) : null,
        comments: flight?.comments || "",
        segmentCount: itinerary.segmentCount,
        initialDeparture: itinerary.initialDeparture,
        finalArrival: itinerary.finalArrival,
        ...purchase,
      };
    });

    res.send({
      trip: {
        id: tripJson.id,
        name: tripJson.name,
        startDate: tripJson.startDate,
        endDate: tripJson.endDate,
        organizationName,
      },
      participants,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.updateFlightHeader = async (req, res) => {
  try {
    const tripId = req.params.id;
    const tripPeopleRoleId = Number(req.params.tripPeopleRoleId);
    const manage = await canManageTripFlights(req, tripId);
    if (!manage.ok) return forbid(res, manage);

    const assignment = await loadEligibleAssignment(tripId, tripPeopleRoleId);
    if (!assignment) {
      return res.status(404).send({ message: "Participant not found for this trip." });
    }

    const participantPaysOwn = assignment.flightPurchaseOption === "self";

    let cost = null;
    if (participantPaysOwn) {
      cost = 0;
    } else if (Object.prototype.hasOwnProperty.call(req.body, "cost")) {
      if (req.body.cost === null || req.body.cost === "") {
        cost = null;
      } else {
        cost = Number(req.body.cost);
        if (!Number.isFinite(cost) || cost < 0) {
          return res.status(400).send({ message: "Cost must be a non-negative number or empty." });
        }
      }
    }

    const purchased =
      req.body.purchased === true ||
      req.body.purchased === 1 ||
      req.body.purchased === "1" ||
      req.body.purchased === "true";

    const comments =
      req.body.comments != null ? String(req.body.comments) : null;

    let flight = await TripFlight.findOne({ where: { tripPeopleRoleId } });
    if (!flight) {
      flight = await TripFlight.create({
        tripPeopleRoleId,
        purchased,
        cost:
          participantPaysOwn || Object.prototype.hasOwnProperty.call(req.body, "cost")
            ? cost
            : null,
        comments,
      });
    } else {
      const patch = { purchased };
      if (participantPaysOwn || Object.prototype.hasOwnProperty.call(req.body, "cost")) {
        patch.cost = cost;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, "comments")) patch.comments = comments;
      await flight.update(patch);
    }

    res.send({
      tripPeopleRoleId,
      purchased: !!flight.purchased,
      cost: flight.cost != null ? Number(flight.cost) : null,
      comments: flight.comments || "",
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findSegments = async (req, res) => {
  try {
    const tripId = req.params.id;
    const tripPeopleRoleId = Number(req.params.tripPeopleRoleId);
    const manage = await canManageTripFlights(req, tripId);
    if (!manage.ok) return forbid(res, manage);

    const assignment = await loadEligibleAssignment(tripId, tripPeopleRoleId);
    if (!assignment) {
      return res.status(404).send({ message: "Participant not found for this trip." });
    }

    const flight = await TripFlight.findOne({
      where: { tripPeopleRoleId },
      include: [
        {
          model: TripFlightSegment,
          as: "segments",
          include: segmentIncludes,
        },
      ],
    });

    const segments = (flight?.segments || [])
      .slice()
      .sort((a, b) => a.segmentNumber - b.segmentNumber)
      .map(serializeSegment);

    res.send({ tripPeopleRoleId, segments });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.replaceSegments = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const tripId = req.params.id;
    const tripPeopleRoleId = Number(req.params.tripPeopleRoleId);
    const manage = await canManageTripFlights(req, tripId);
    if (!manage.ok) {
      await transaction.rollback();
      return forbid(res, manage);
    }

    const assignment = await loadEligibleAssignment(tripId, tripPeopleRoleId);
    if (!assignment) {
      await transaction.rollback();
      return res.status(404).send({ message: "Participant not found for this trip." });
    }

    const bodySegments = Array.isArray(req.body.segments) ? req.body.segments : null;
    if (!bodySegments) {
      await transaction.rollback();
      return res.status(400).send({ message: "segments array is required." });
    }

    const segmentNumbers = new Set();
    const normalized = [];

    for (const raw of bodySegments) {
      const segmentNumber = Number(raw.segmentNumber);
      if (!Number.isInteger(segmentNumber) || segmentNumber <= 0) {
        await transaction.rollback();
        return res.status(400).send({ message: "Each segment needs a positive segment number." });
      }
      if (segmentNumbers.has(segmentNumber)) {
        await transaction.rollback();
        return res.status(400).send({ message: "Duplicate segment numbers are not allowed." });
      }
      segmentNumbers.add(segmentNumber);

      const departureAirportCode = String(raw.departureAirportCode || "").trim().toUpperCase();
      const arrivalAirportCode = String(raw.arrivalAirportCode || "").trim().toUpperCase();
      const airlineCode = String(raw.airlineCode || "").trim().toUpperCase();
      const flightNumber = String(raw.flightNumber || "").trim();
      const departureDate = String(raw.departureDate || "").slice(0, 10);
      const arrivalDate = String(raw.arrivalDate || "").slice(0, 10);
      const departureTime = formatTime(raw.departureTime);
      const arrivalTime = formatTime(raw.arrivalTime);
      const cabinClass = String(raw.cabinClass ?? "").trim() || null;
      const seatNumber = String(raw.seatNumber ?? "").trim() || null;

      if (
        !departureAirportCode ||
        !arrivalAirportCode ||
        !airlineCode ||
        !flightNumber ||
        !DATE_ONLY.test(departureDate) ||
        !DATE_ONLY.test(arrivalDate) ||
        !TIME_HHMM.test(departureTime || "") ||
        !TIME_HHMM.test(arrivalTime || "")
      ) {
        await transaction.rollback();
        return res.status(400).send({
          message:
            "Each segment requires airports, airline, flight number, and valid departure/arrival date and time.",
        });
      }

      if (compareDateTime(arrivalDate, arrivalTime, departureDate, departureTime) < 0) {
        await transaction.rollback();
        return res
          .status(400)
          .send({ message: `Segment ${segmentNumber}: arrival must not be before departure.` });
      }

      const depAirport = await Airport.findOne({
        where: { code: departureAirportCode },
        transaction,
      });
      if (!depAirport) {
        await transaction.rollback();
        return res
          .status(400)
          .send({ message: `Unknown departure airport code: ${departureAirportCode}.` });
      }
      const arrAirport = await Airport.findOne({
        where: { code: arrivalAirportCode },
        transaction,
      });
      if (!arrAirport) {
        await transaction.rollback();
        return res
          .status(400)
          .send({ message: `Unknown arrival airport code: ${arrivalAirportCode}.` });
      }
      const airline = await Airline.findOne({ where: { code: airlineCode }, transaction });
      if (!airline) {
        await transaction.rollback();
        return res.status(400).send({ message: `Unknown airline code: ${airlineCode}.` });
      }

      normalized.push({
        segmentNumber,
        departureAirportId: depAirport.id,
        arrivalAirportId: arrAirport.id,
        airlineId: airline.id,
        flightNumber,
        departureDate,
        departureTime,
        arrivalDate,
        arrivalTime,
        cabinClass,
        seatNumber,
      });
    }

    const flight = await ensureFlight(tripPeopleRoleId, transaction);
    await TripFlightSegment.destroy({ where: { tripFlightId: flight.id }, transaction });
    for (const seg of normalized) {
      await TripFlightSegment.create({ tripFlightId: flight.id, ...seg }, { transaction });
    }

    await transaction.commit();

    const reloaded = await TripFlightSegment.findAll({
      where: { tripFlightId: flight.id },
      include: segmentIncludes,
      order: [["segmentNumber", "ASC"]],
    });
    res.send({
      tripPeopleRoleId,
      segments: reloaded.map(serializeSegment),
      ...deriveItinerary(reloaded),
    });
  } catch (err) {
    await transaction.rollback();
    res.status(500).send({ message: err.message });
  }
};

export default exports;
