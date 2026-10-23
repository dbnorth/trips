import db from "../models/index.js";

const toNumber = (value) =>
  value == null || value === "" || Number.isNaN(Number(value)) ? null : Number(value);

export const roundMoney = (value) => Math.round(value * 100) / 100;

/** A participant's cost (`null` when unknown). The assignment's participant cost overrides the trip's. */
export const participantCost = (trip, assignment) =>
  toNumber(assignment?.participantCost) ?? toNumber(trip?.participantCost);

/** Flight cost when the application says the organization buys the flight; otherwise 0. */
export const loadAirfare = async (assignment) => {
  if (assignment?.flightPurchaseOption !== "organization") return 0;
  const flight = await db.tripFlight.findOne({ where: { tripPeopleRoleId: assignment.id } });
  return flight?.cost != null ? Number(flight.cost) : 0;
};

/** An assignment's add-on expenses in the order they were entered. */
export const loadAddonExpenses = async (assignmentId) => {
  const rows = await db.tripPeopleRoleExpense.findAll({
    where: { tripPeopleRoleId: assignmentId },
    order: [["id", "ASC"]],
  });
  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    cost: Number(row.cost) || 0,
  }));
};

/**
 * Total trip cost = participant cost + organization-booked airfare + add-on expenses
 * (`null` when the participant cost is unknown). Trip options are already in the participant cost.
 */
export const participantTotals = async (trip, assignment) => {
  const cost = participantCost(trip, assignment);
  const airfare = assignment ? await loadAirfare(assignment) : 0;
  const addonExpenses = assignment ? await loadAddonExpenses(assignment.id) : [];
  const addonTotal = roundMoney(addonExpenses.reduce((sum, expense) => sum + expense.cost, 0));
  const totalTripCost = cost == null ? null : roundMoney(cost + airfare + addonTotal);
  return { participantCost: cost, airfare, addonExpenses, addonTotal, totalTripCost };
};

/** Selected trip options on an assignment, ordered by set number, then option order. */
export const loadSelectedTripOptions = async (assignmentId) => {
  const rows = await db.tripPeopleRoleOption.findAll({
    where: { tripPeopleRoleId: assignmentId, selected: true },
    include: [{ model: db.tripTravelOption, as: "tripTravelOption" }],
  });
  return rows
    .map((row) => row.tripTravelOption)
    .filter(Boolean)
    .sort((a, b) => a.setNumber - b.setNumber || a.id - b.id)
    .map((option) => ({ description: option.description, amount: Number(option.priceAdjustment) || 0 }));
};

/**
 * The parts of the total trip cost. `adjustment` is whatever the participant cost holds beyond
 * the trip cost and selected options (a staff override), so the parts always add up to the total.
 */
export const participantCostBreakdown = async (trip, assignment) => {
  const { participantCost: cost, airfare, addonExpenses, totalTripCost } = await participantTotals(
    trip,
    assignment
  );
  const tripCost = toNumber(trip?.participantCost);
  const tripOptions = assignment ? await loadSelectedTripOptions(assignment.id) : [];
  const optionsTotal = tripOptions.reduce((sum, option) => sum + option.amount, 0);
  const adjustment = cost == null ? 0 : roundMoney(cost - (tripCost ?? 0) - optionsTotal);
  return {
    tripCost,
    tripOptions,
    adjustment,
    addonExpenses: addonExpenses.map(({ description, cost: amount }) => ({ description, amount })),
    airfare,
    totalTripCost,
  };
};

/** What is still owed after `raised`, never below 0 (`null` when the total is unknown). */
export const amountOwed = (totalTripCost, raised) =>
  totalTripCost == null ? null : Math.max(0, roundMoney(totalTripCost - raised));
