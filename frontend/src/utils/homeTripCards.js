import { formatDate, formatDateRange } from "./dateFormat.js";
import { formatMoneyDisplay } from "./moneyUtils.js";
import { myApplyButtonLabel } from "./roleAvailability.js";

const ymd = (value) => {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
};

export const localToday = (now = new Date()) => {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const dayDiff = (from, to) => {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const ms = Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay);
  return Math.round(ms / 86400000);
};

const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""));

const byStart = (a, b) => ymd(a.startDate).localeCompare(ymd(b.startDate)) || byName(a, b);

/** "160 days away", "Starts today", "In progress", or "Ended". */
export const tripDatePhrase = (trip, today = localToday()) => {
  const start = ymd(trip?.startDate);
  const end = ymd(trip?.endDate);
  if (end && end < today) return "Ended";
  if (start && start < today) return "In progress";
  if (start === today) return "Starts today";
  if (start && start > today) {
    const days = dayDiff(today, start);
    return days === 1 ? "1 day away" : `${days} days away`;
  }
  return "";
};

/** "04/22/2026 – 04/26/2026 · 160 days away", or "" when the trip has no dates. */
export const tripDateLine = (trip, today = localToday()) => {
  const start = ymd(trip?.startDate);
  const end = ymd(trip?.endDate);
  if (!start && !end) return "";
  const range = formatDateRange(start, end);
  const phrase = tripDatePhrase(trip, today);
  return phrase ? `${range} · ${phrase}` : range;
};

const displayTime = (hhmm) => {
  const [hourText, minute] = String(hhmm).split(":");
  const hour = Number(hourText);
  if (!minute || Number.isNaN(hour)) return "";
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${suffix}`;
};

/** "Departs OKC 04/22/2026 6:03 PM." Missing date or time is left out. */
export const departureLine = (departure) => {
  if (!departure?.airportCode) return "";
  const parts = ["Departs", departure.airportCode];
  const date = departure.date ? formatDate(departure.date) : "";
  const time = departure.time ? displayTime(departure.time) : "";
  if (date) parts.push(date);
  if (time) parts.push(time);
  return `${parts.join(" ")}.`;
};

/**
 * Progress lines for a Pre-Approved or Approved card.
 * Omitted when the next step already states that fact.
 */
export const homeCardLines = (trip) => {
  const status = trip?.applicationStatus;
  const card = trip?.homeCard;
  if (!card || (status !== "pre_approved" && status !== "approved")) return [];
  const codes = new Set((trip.nextActions || []).map((action) => action.code));
  const lines = [];
  if (card.totalTripCost != null && !codes.has("make-deposit") && !codes.has("make-donation")) {
    lines.push(`${formatMoneyDisplay(card.amountRaised)} raised of ${formatMoneyDisplay(card.totalTripCost)}.`);
  }
  if (Number(card.documentsRequired) > 0 && !codes.has("upload-documents")) {
    lines.push(`${card.documentsUploaded} of ${card.documentsRequired} documents uploaded.`);
  }
  if (status === "approved") {
    const flight = departureLine(card.departure);
    if (flight) lines.push(flight);
  }
  return lines;
};

/** Upcoming trips first (soonest start), then past trips (latest start). */
export const sortMyTrips = (trips, today = localToday()) => {
  const upcoming = [];
  const past = [];
  for (const trip of trips || []) {
    const start = ymd(trip.startDate);
    if (start && start >= today) upcoming.push(trip);
    else past.push(trip);
  }
  upcoming.sort(byStart);
  past.sort((a, b) => ymd(b.startDate).localeCompare(ymd(a.startDate)) || byName(a, b));
  return [...upcoming, ...past];
};

/** Trips the person can apply for first, then trips with no spot. Each group is soonest first. */
export const sortAvailableTrips = (trips) => {
  const open = [];
  const full = [];
  for (const trip of trips || []) {
    if (myApplyButtonLabel(trip.roleAvailability, trip.myReservedTripWorkerRoleId)) open.push(trip);
    else full.push(trip);
  }
  open.sort(byStart);
  full.sort(byStart);
  return [...open, ...full];
};
