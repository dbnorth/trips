/**
 * Feature 15 — host subdomain helper
 * Spec: features/feature-15-organization-subdomain-registration.md
 */

import { describe, it, expect } from "vitest";
import { getRegistrationHostSubdomain } from "../src/utils/hostSubdomain.js";

describe("getRegistrationHostSubdomain", () => {
  it("returns leftmost label for multi-part hosts", () => {
    expect(getRegistrationHostSubdomain("hope.missiontrips.app")).toBe("hope");
  });

  it("returns null for apex, localhost, IP, and reserved labels", () => {
    expect(getRegistrationHostSubdomain("missiontrips.app")).toBeNull();
    expect(getRegistrationHostSubdomain("localhost")).toBeNull();
    expect(getRegistrationHostSubdomain("127.0.0.1")).toBeNull();
    expect(getRegistrationHostSubdomain("www.missiontrips.app")).toBeNull();
  });
});
