import { formatMoneyDisplay } from "./moneyUtils.js";

export const APPLICATION_ACTION_CODES = ["complete-application", "submit-application"];

export const hasApplicationAction = (actions) =>
  (actions || []).some((a) => APPLICATION_ACTION_CODES.includes(a.code));

const formatDate = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "";
};

export const nextActionText = (action) => {
  if (action.code === "complete-application") return "Complete your application.";
  if (action.code === "submit-application") return "Submit your application.";
  if (action.code === "wait-approval") return "Waiting on approval.";
  if (action.code === "make-deposit") {
    return `Make your deposit: ${formatMoneyDisplay(action.amountRaised)} raised of ${formatMoneyDisplay(action.deposit)}.`;
  }
  if (action.code === "make-donation") {
    return `Make a donation: ${formatMoneyDisplay(action.amountOwed)} still owed.`;
  }
  if (action.code === "enter-flights") return "Enter your flight info.";
  if (action.code === "arrival-flight-mismatch") {
    return `Your arrival flight lands ${formatDate(action.flightDate)}, but you are planned to arrive ${formatDate(action.plannedDate)}.`;
  }
  if (action.code === "return-flight-mismatch") {
    return `Your return flight leaves ${formatDate(action.flightDate)}, but you are planned to depart ${formatDate(action.plannedDate)}.`;
  }
  if (action.code === "all-ready") return "You are all ready for the trip.";
  return "";
};

export const nextActionsTone = (actions) => {
  const codes = (actions || []).map((a) => a.code);
  if (codes.includes("wait-approval")) return "waiting";
  if (codes.includes("all-ready")) return "ready";
  return "needed";
};
