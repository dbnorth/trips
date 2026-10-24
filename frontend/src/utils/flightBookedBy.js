/** "Booked by" value from an application's flight purchase option. */
export const flightBookedByLabel = (flightPurchaseOption, organizationName) => {
  if (flightPurchaseOption === "organization") return organizationName || "Organization";
  if (flightPurchaseOption === "self") return "Participant";
  return "Not chosen";
};
