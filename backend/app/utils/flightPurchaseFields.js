import db from "../models/index.js";

export const FLIGHT_PURCHASE_SELF = "self";
export const FLIGHT_PURCHASE_ORGANIZATION = "organization";
export const FLIGHT_PURCHASE_OPTIONS = [FLIGHT_PURCHASE_SELF, FLIGHT_PURCHASE_ORGANIZATION];

const Airport = db.airport;
const Airline = db.airline;

const parseOptionalBool = (value) => {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  if (value == null || value === "") return null;
  return undefined;
};

/**
 * Parse application flight-purchase fields from a request body.
 * When option is not `organization`, preference FKs/class are cleared.
 */
export const parseFlightPurchaseFields = async (body, { transaction } = {}) => {
  const raw = body?.flightPurchaseOption;
  let flightPurchaseOption = null;
  if (raw === FLIGHT_PURCHASE_SELF || raw === FLIGHT_PURCHASE_ORGANIZATION) {
    flightPurchaseOption = raw;
  } else if (raw != null && String(raw).trim() !== "") {
    return {
      ok: false,
      message: "Flight purchase option must be self or organization.",
    };
  }

  if (flightPurchaseOption !== FLIGHT_PURCHASE_ORGANIZATION) {
    return {
      ok: true,
      flightPurchaseOption,
      preferredDepartureAirportId: null,
      preferredReturnAirportId: null,
      preferredCabinClass: null,
      preferredAirlineId: null,
      preferredRefundableTicket: null,
    };
  }

  const departureCode = String(body?.preferredDepartureAirportCode || "")
    .trim()
    .toUpperCase();
  const returnCode = String(body?.preferredReturnAirportCode || "")
    .trim()
    .toUpperCase();
  const airlineCode = String(body?.preferredAirlineCode || "")
    .trim()
    .toUpperCase();
  const preferredCabinClass = String(body?.preferredCabinClass || "").trim() || null;
  const preferredRefundableTicket = parseOptionalBool(body?.preferredRefundableTicket);
  if (preferredRefundableTicket === undefined) {
    return {
      ok: false,
      message: "Refundable ticket must be true or false when the organization purchases travel.",
    };
  }

  let preferredDepartureAirportId = null;
  let preferredReturnAirportId = null;
  let preferredAirlineId = null;

  if (departureCode) {
    const airport = await Airport.findOne({ where: { code: departureCode }, transaction });
    if (!airport) {
      return { ok: false, message: `Unknown preferred departure airport code: ${departureCode}.` };
    }
    preferredDepartureAirportId = airport.id;
  }
  if (returnCode) {
    const airport = await Airport.findOne({ where: { code: returnCode }, transaction });
    if (!airport) {
      return { ok: false, message: `Unknown preferred return airport code: ${returnCode}.` };
    }
    preferredReturnAirportId = airport.id;
  }
  if (airlineCode) {
    const airline = await Airline.findOne({ where: { code: airlineCode }, transaction });
    if (!airline) {
      return { ok: false, message: `Unknown preferred airline code: ${airlineCode}.` };
    }
    preferredAirlineId = airline.id;
  }

  return {
    ok: true,
    flightPurchaseOption,
    preferredDepartureAirportId,
    preferredReturnAirportId,
    preferredCabinClass,
    preferredAirlineId,
    preferredRefundableTicket,
  };
};

export const isFlightPurchaseComplete = ({
  flightPurchaseOption = null,
  preferredDepartureAirportId = null,
  preferredReturnAirportId = null,
  preferredCabinClass = null,
  preferredAirlineId = null,
  preferredRefundableTicket = null,
} = {}) => {
  if (flightPurchaseOption !== FLIGHT_PURCHASE_SELF && flightPurchaseOption !== FLIGHT_PURCHASE_ORGANIZATION) {
    return false;
  }
  if (flightPurchaseOption === FLIGHT_PURCHASE_ORGANIZATION) {
    if (preferredDepartureAirportId == null) return false;
    if (preferredReturnAirportId == null) return false;
    if (!preferredCabinClass || String(preferredCabinClass).trim() === "") return false;
    if (preferredAirlineId == null) return false;
    if (preferredRefundableTicket !== true && preferredRefundableTicket !== false) return false;
  }
  return true;
};

/** Attach code fields for API/UI consumers from included associations or raw FKs. */
export const flightPurchaseCodesFromRow = (row) => {
  const json = row && typeof row.toJSON === "function" ? row.toJSON() : row || {};
  return {
    flightPurchaseOption: json.flightPurchaseOption || null,
    preferredDepartureAirportCode: json.preferredDepartureAirport?.code || null,
    preferredReturnAirportCode: json.preferredReturnAirport?.code || null,
    preferredCabinClass: json.preferredCabinClass || null,
    preferredAirlineCode: json.preferredAirline?.code || null,
    preferredRefundableTicket:
      json.preferredRefundableTicket === true || json.preferredRefundableTicket === false
        ? json.preferredRefundableTicket
        : null,
    preferredDepartureAirportId: json.preferredDepartureAirportId ?? null,
    preferredReturnAirportId: json.preferredReturnAirportId ?? null,
    preferredAirlineId: json.preferredAirlineId ?? null,
  };
};

export const flightPurchaseInclude = [
  {
    model: Airport,
    as: "preferredDepartureAirport",
    attributes: ["id", "code", "city", "airportName"],
    required: false,
  },
  {
    model: Airport,
    as: "preferredReturnAirport",
    attributes: ["id", "code", "city", "airportName"],
    required: false,
  },
  {
    model: Airline,
    as: "preferredAirline",
    attributes: ["id", "code", "name"],
    required: false,
  },
];
