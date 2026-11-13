/**
 * Feature 136 — Trip View Flight Itinerary
 * Spec: features/feature-136-trip-view-flight-itinerary.md
 */

import { describe, it, expect } from "vitest";
import { parseItineraryText } from "../src/utils/itineraryText.js";
import airlines from "../../backend/app/data/airlines.json";
import airports from "../../backend/app/data/airports.json";

const catalogs = {
  airlines: [{ code: "AA" }],
  airports: [{ code: "DFW" }, { code: "GUA" }],
  plannedDeparture: "2027-06-08",
  tripStartDate: "2027-06-01",
};

describe("Feature 136 — Trip View Flight Itinerary", () => {
  it("A flight missing a time is left out", () => {
    const parsed = parseItineraryText(
      `AA 100 departs DFW on June 1, 2027 at 8:30 AM and arrives GUA at 12:00 PM.
AA 200 departs GUA on June 8, 2027.`,
      catalogs
    );

    expect(parsed.text).toContain("AA 100: DFW 06/01/2027 8:30 AM to GUA 06/01/2027 12:00 PM");
    expect(parsed.text).toContain('Not read: "AA 200 departs GUA on June 8, 2027."');
    expect(parsed.flights.map((flight) => flight.flightNumber)).toEqual(["100"]);
    expect(parsed.flights[0].segmentType).toBe("arrival");
  });

  it("An unknown airport is not loaded", () => {
    const parsed = parseItineraryText(
      "AA 100 departs ZZZ on June 1, 2027 at 8:30 AM and arrives GUA at 12:00 PM.",
      catalogs
    );

    expect(parsed.text).toContain(
      'Not read: "AA 100 departs ZZZ on June 1, 2027 at 8:30 AM and arrives GUA at 12:00 PM."'
    );
    expect(parsed.flights).toEqual([]);
  });

  it("An American Airlines email is read", () => {
    const parsed = parseItineraryText(
      `Confirmation code: FRUAQC
Wednesday, April 22, 2026
Image
OKC
Oklahoma City
6:03 PM
AA 5381
Operated by PSA Airlines as American Eagle
CLT
Charlotte
9:50 PM
Seat: 14A
Class: Economy (Y)
Meals:
Image
CLT
Charlotte
11:06 PM
AA 1882
RIC
Richmond
12:23 AM
Seat: 13C
Class: Economy (Y)
Meals:
Image  Flight arrives Thursday, April 23, 2026
Sunday, April 26, 2026
Image
RIC
Richmond
7:17 PM
AA 2672
DFW
Dallas/Fort Worth
9:44 PM
Seat: 19C
Class: Economy (Y)
Meals: Food for purchase
Image
DFW
Dallas/Fort Worth
10:53 PM
AA 2734
OKC
Oklahoma City
11:55 PM
Seat: 13C
Class: Economy (Y)
Meals:`,
      { airlines, airports, plannedDeparture: "2026-05-01", tripStartDate: "2026-04-22" }
    );

    expect(parsed.confirmationNumber).toBe("FRUAQC");
    expect(parsed.text).toContain("Confirmation code: FRUAQC");
    expect(parsed.text).toContain("AA 5381: OKC 04/22/2026 6:03 PM to CLT 04/22/2026 9:50 PM, seat 14A");
    expect(parsed.text).toContain("AA 1882: CLT 04/22/2026 11:06 PM to RIC 04/23/2026 12:23 AM, seat 13C");
    expect(parsed.text).toContain("AA 2672: RIC 04/26/2026 7:17 PM to DFW 04/26/2026 9:44 PM, seat 19C");
    expect(parsed.text).toContain("AA 2734: DFW 04/26/2026 10:53 PM to OKC 04/26/2026 11:55 PM, seat 13C");
    expect(parsed.flights.map((flight) => flight.seatNumber)).toEqual(["14A", "13C", "19C", "13C"]);
    expect(parsed.text).not.toContain("Not read:");
    expect(parsed.flights.map((flight) => flight.segmentType)).toEqual([
      "arrival",
      "arrival",
      "return",
      "return",
    ]);
  });
});
