import db from "../models/index.js";
import { TRIP_OPTION_DAYS_MESSAGES, daysLimitMessage } from "./tripDays.js";

const TripTravelOption = db.tripTravelOption;
const TripPeopleRoleOption = db.tripPeopleRoleOption;

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

export const loadTripTravelOptions = async (tripId) =>
  TripTravelOption.findAll({
    where: { tripId },
    order: [
      ["setNumber", "ASC"],
      ["id", "ASC"],
    ],
  });

export const parseSelectedTravelOptionIds = (body) => {
  const raw = body?.selectedTravelOptionIds;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
};

/** Sum of the price adjustments of the selected trip options. */
export const selectedOptionsTotal = (travelOptions, selectedIds) => {
  const selected = new Set((selectedIds || []).map(Number));
  return roundMoney(
    (travelOptions || []).reduce((sum, option) => {
      if (!selected.has(Number(option.id))) return sum;
      const amount = Number(option.priceAdjustment);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0)
  );
};

export const computeParticipantCostWithOptions = (baseCost, travelOptions, selectedIds) => {
  const base = Number(baseCost);
  const safeBase = Number.isFinite(base) ? base : 0;
  return roundMoney(safeBase + selectedOptionsTotal(travelOptions, selectedIds));
};

/**
 * The participant cost moved by `difference`. A blank cost starts from the trip cost; blank with
 * no trip cost stays blank.
 */
export const shiftParticipantCost = (participantCost, tripCost, difference) => {
  if (!roundMoney(difference)) return participantCost;
  const base =
    participantCost != null && participantCost !== ""
      ? Number(participantCost)
      : tripCost != null && tripCost !== ""
        ? Number(tripCost)
        : null;
  if (base == null || !Number.isFinite(base)) return participantCost;
  return roundMoney(base + difference);
};

export const validateSelectedTravelOptionIds = (travelOptions, selectedIds) => {
  const byId = new Map((travelOptions || []).map((o) => [Number(o.id), o]));
  const invalid = (selectedIds || []).filter((id) => !byId.has(Number(id)));
  if (invalid.length) {
    return { ok: false, message: "One or more selected travel options are invalid for this trip." };
  }

  const groups = new Map();
  for (const option of travelOptions || []) {
    const setNumber = Number(option.setNumber) > 0 ? Number(option.setNumber) : 1;
    if (!groups.has(setNumber)) groups.set(setNumber, []);
    groups.get(setNumber).push(option);
  }

  const selected = new Set((selectedIds || []).map(Number));
  // An unanswered option group keeps the application incomplete rather than blocking the save.
  let missingSelection = false;
  for (const [, setOptions] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const selectedInSet = setOptions.filter((o) => selected.has(Number(o.id)));
    if (selectedInSet.length > 1) {
      return {
        ok: false,
        message: "Only one travel option can be selected per trip option group.",
      };
    }
    if (setOptions.length > 1 && selectedInSet.length !== 1) {
      missingSelection = true;
    }
  }

  const daysMessage = daysLimitMessage(
    (travelOptions || []).filter((o) => selected.has(Number(o.id))),
    TRIP_OPTION_DAYS_MESSAGES
  );
  if (daysMessage) return { ok: false, message: daysMessage };

  return { ok: true, missingSelection };
};

/** Ids of the assignment's selected trip options. */
export const loadSelectedTravelOptionIds = async (tripPeopleRoleId) => {
  const rows = await TripPeopleRoleOption.findAll({ where: { tripPeopleRoleId, selected: true } });
  return rows.map((row) => Number(row.tripTravelOptionId));
};

export const syncTripPeopleRoleOptions = async (
  tripPeopleRoleId,
  travelOptions,
  selectedIds,
  { transaction } = {}
) => {
  const selected = new Set((selectedIds || []).map(Number));
  const existing = await TripPeopleRoleOption.findAll({ where: { tripPeopleRoleId }, transaction });
  const existingByOptionId = new Map(
    existing.map((row) => [Number(row.tripTravelOptionId), row])
  );
  const keepOptionIds = new Set((travelOptions || []).map((o) => Number(o.id)));

  for (const option of travelOptions || []) {
    const optionId = Number(option.id);
    const isSelected = selected.has(optionId);
    const row = existingByOptionId.get(optionId);
    if (row) {
      if (!!row.selected !== isSelected) {
        await row.update({ selected: isSelected }, { transaction });
      }
    } else {
      await TripPeopleRoleOption.create(
        {
          tripPeopleRoleId,
          tripTravelOptionId: optionId,
          selected: isSelected,
        },
        { transaction }
      );
    }
  }

  for (const row of existing) {
    if (!keepOptionIds.has(Number(row.tripTravelOptionId))) {
      await row.destroy({ transaction });
    }
  }
};
