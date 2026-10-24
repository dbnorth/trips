/**
 * Warnings when the first Arrival segment does not depart from the requested departure airport,
 * or the last Return segment does not arrive at the requested return airport (Feature 79).
 */
export const flightAirportWarnings = ({ arrivalFlightOriginCode, returnFlightDestinationCode, preferences }) => {
  const warnings = { arrival: "", return: "" };
  const requestedDeparture = preferences?.departureAirportCode;
  const requestedReturn = preferences?.returnAirportCode;
  if (requestedDeparture && arrivalFlightOriginCode && arrivalFlightOriginCode !== requestedDeparture) {
    warnings.arrival = `Arrival flight departs from ${arrivalFlightOriginCode}, but ${requestedDeparture} was requested.`;
  }
  if (requestedReturn && returnFlightDestinationCode && returnFlightDestinationCode !== requestedReturn) {
    warnings.return = `Return flight arrives at ${returnFlightDestinationCode}, but ${requestedReturn} was requested.`;
  }
  return warnings;
};
