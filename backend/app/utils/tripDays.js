import db from "../models/index.js";

export const DAYS_MESSAGE = "Days before and after must be whole numbers from 0 to 365.";

export const TRIP_OPTION_DAYS_MESSAGES = {
  before: "Choose only one trip option with days before the trip.",
  after: "Choose only one trip option with days after the trip.",
};

export const ADDON_EXPENSE_DAYS_MESSAGES = {
  before: "Only one add-on expense can have days before the trip.",
  after: "Only one add-on expense can have days after the trip.",
};

/** Whole number of days from 0 to 365 (blank is 0), or `null` when invalid. */
export const parseDays = (value) => {
  if (value == null || value === "") return 0;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > 365) return null;
  return days;
};

/** The message when more than one item has days before (or after), otherwise `null`. */
export const daysLimitMessage = (items, messages) => {
  if ((items || []).filter((item) => Number(item.daysBefore) > 0).length > 1) return messages.before;
  if ((items || []).filter((item) => Number(item.daysAfter) > 0).length > 1) return messages.after;
  return null;
};

/** `YYYY-MM-DD` moved by `days`, or `null` when there is no date. */
const shiftDate = (value, days) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return date.toISOString().slice(0, 10);
};

const sumDays = (items, key) => items.reduce((total, item) => total + (Number(item[key]) || 0), 0);

/** `{ type, description, days }` for each item with days in `key`. */
const adjustments = (items, key) =>
  items
    .filter((item) => Number(item[key]) > 0)
    .map((item) => ({ type: item.type, description: item.description, days: Number(item[key]) }));

/**
 * Arrival (trip start minus days before) and departure (trip end plus days after) dates, adding
 * the days of the assignment's selected trip options and add-on expenses, with the options
 * (`type` "option") and add-on expenses (`type` "addon") that moved each date.
 */
export const participantTravelDates = async (trip, assignmentId) => {
  const items = [];
  if (assignmentId) {
    const selected = await db.tripPeopleRoleOption.findAll({
      where: { tripPeopleRoleId: assignmentId, selected: true },
      include: [{ model: db.tripTravelOption, as: "tripTravelOption" }],
    });
    const options = selected
      .map((row) => row.tripTravelOption)
      .filter(Boolean)
      .sort((a, b) => a.setNumber - b.setNumber || a.id - b.id);
    const expenses = await db.tripPeopleRoleExpense.findAll({
      where: { tripPeopleRoleId: assignmentId },
      order: [["id", "ASC"]],
    });
    for (const option of options) items.push({ ...option.toJSON(), type: "option" });
    for (const expense of expenses) items.push({ ...expense.toJSON(), type: "addon" });
  }
  return {
    arrivalDate: shiftDate(trip?.startDate, -sumDays(items, "daysBefore")),
    departureDate: shiftDate(trip?.endDate, sumDays(items, "daysAfter")),
    arrivalAdjustments: trip?.startDate ? adjustments(items, "daysBefore") : [],
    departureAdjustments: trip?.endDate ? adjustments(items, "daysAfter") : [],
  };
};

const dateOnly = (value) => (value ? String(value).slice(0, 10) : null);

/**
 * The day the flights land for the trip (arrival date of the last Arrival segment) and leave for
 * home (departure date of the first Return segment), `null` when there is no such segment or date.
 */
export const flightDatesFromSegments = (segments) => {
  const ofType = (type) =>
    (segments || [])
      .filter((segment) => (segment.segmentType || "arrival") === type)
      .sort((a, b) => a.segmentNumber - b.segmentNumber);
  return {
    flightArrivalDate: dateOnly(ofType("arrival").at(-1)?.arrivalDate),
    flightDepartureDate: dateOnly(ofType("return")[0]?.departureDate),
  };
};

/** `flightDatesFromSegments` for an assignment's saved flight. */
export const participantFlightDates = async (assignmentId) => {
  const flight = assignmentId
    ? await db.tripFlight.findOne({
        where: { tripPeopleRoleId: assignmentId },
        include: [{ model: db.tripFlightSegment, as: "segments" }],
      })
    : null;
  return flightDatesFromSegments(flight?.segments);
};
