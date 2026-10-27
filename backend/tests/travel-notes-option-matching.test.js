/**
 * Feature 88 — Travel Notes Option Matching
 * Spec: features/feature-88-travel-notes-option-matching.md
 */

import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, createOrgAdminUser, findRole } from "./helpers.js";

const HEADER = fs.readFileSync(path.resolve("tests/fixtures/trip-master-sample.csv"), "utf8").split("\n").slice(0, 3);

/** A Trip Master RN row with a name tag and no flight fee. */
const rnRow = (firstName, travelNotes) => {
  const cells = Array(37).fill("");
  Object.assign(cells, {
    0: "RN",
    2: "X",
    3: `${firstName.toLowerCase()}@example.org`,
    4: firstName,
    6: "Tester",
    10: travelNotes,
    17: "Yes",
    32: "$0.00",
  });
  return cells.map((cell) => `"${cell}"`).join(",");
};

describe("Feature 88 — Travel Notes Option Matching", () => {
  let omar;
  let trip;
  let options;

  const importRows = (rows) =>
    request(app)
      .post(`/trips/trips/${trip.id}/import-trip-master`)
      .set(omar.authHeader)
      .attach("file", Buffer.from([...HEADER, ...rows.map((row) => rnRow(...row))].join("\n")), {
        filename: "trip-master.csv",
        contentType: "text/csv",
      });

  const assignmentOf = async (firstName) => {
    const person = await db.person.findOne({ where: { firstName, lastName: "Tester" } });
    return db.tripPeopleRole.findOne({ where: { tripId: trip.id, peopleId: person.id } });
  };

  const selectedOptions = async (firstName) => {
    const rows = await db.tripPeopleRoleOption.findAll({
      where: { tripPeopleRoleId: (await assignmentOf(firstName)).id, selected: true },
      include: [{ model: db.tripTravelOption, as: "tripTravelOption" }],
      order: [["tripTravelOptionId", "ASC"]],
    });
    return rows.map((row) => row.tripTravelOption.description);
  };

  const participantCost = async (firstName) => Number((await assignmentOf(firstName)).participantCost);

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    omar = await createOrgAdminUser({ email: "omar@example.org", orgName: "Hope Missions" });
    trip = await db.trip.create({
      orgId: omar.org.id,
      name: "Clinica Ezell Hospital - January 2027",
      status: "active",
      startDate: "2027-01-15",
      endDate: "2027-01-22",
      participantCost: 950,
    });
    options = {};
    for (const [key, description, setNumber, priceAdjustment] of [
      ["nameTag", "Need a HTI Name Tag", 1, 0],
      ["ownFlight", "Purchase my own flight", 2, 0],
      ["htiFlight", "HTI purchase my flight (plus flight cost)", 2, 40],
      ["friday", "Arrive Friday - Barceló", 3, 75],
      ["saturday", "Arrive Saturday", 3, 0],
      ["neither", "Neither - contact me about arrival", 3, 0],
      ["antigua", "Antigua Trip - stay Friday night", 4, 200],
      ["departFriday", "Depart Friday", 4, 150],
    ]) {
      options[key] = await db.tripTravelOption.create({ tripId: trip.id, description, setNumber, priceAdjustment });
    }
    const rn = await db.workerRole.create({ orgId: omar.org.id, name: "RN" });
    await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: rn.id, quantity: 10 });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-88.1 — Travel Notes pick the best option in each set", () => {
    it("Keywords only need to be unique within their set", async () => {
      const res = await importRows([["Ana", "SP - Fri Barceló - Antigua"]]);

      expect(res.status).toBe(200);
      expect(await selectedOptions("Ana")).toEqual(["Arrive Friday - Barceló", "Antigua Trip - stay Friday night"]);
      expect(await participantCost("Ana")).toBe(1225);
    });

    it("A word that selects an option isn't used again", async () => {
      await options.antigua.update({ description: "Antigua Trip - stay Friday night, depart Saturday" });

      await importRows([
        ["Ben", "SP - Saturday"],
        ["Hal", "SP - Saturday - Antigua"],
      ]);

      expect(await selectedOptions("Ben")).toEqual(["Arrive Saturday"]);
      expect(await selectedOptions("Hal")).toEqual([
        "Arrive Saturday",
        "Antigua Trip - stay Friday night, depart Saturday",
      ]);
    });

    it("Ties still select nothing", async () => {
      const res = await importRows([["Cy", "Fri or Sat"]]);

      expect(await selectedOptions("Cy")).toEqual([]);
      expect(res.body.notes).toContainEqual({
        row: 4,
        name: "Cy Tester",
        message: 'travel notes "Fri or Sat" match more than one option in Trip Option 3.',
      });
    });
  });

  describe("US-88.2 — \"No\" or \"Not\" picks the other option", () => {
    it("No in front of a word picks the other of two options", async () => {
      await importRows([["Dee", "SP - Sat In - NO Antigua - Room w/Soma Chakraborty"]]);

      expect(await selectedOptions("Dee")).toEqual(["Arrive Saturday", "Depart Friday"]);
      expect(await participantCost("Dee")).toBe(1100);
    });

    it("No in front of a word in a set of one or more than two selects nothing", async () => {
      await db.tripTravelOption.create({ tripId: trip.id, description: "Volcano hike", setNumber: 5, priceAdjustment: 60 });

      await importRows([
        ["Eli", "SP - Not Barceló - Antigua"],
        ["Fay", "SP - Saturday - No volcano"],
      ]);

      expect(await selectedOptions("Eli")).toEqual(["Antigua Trip - stay Friday night"]);
      expect(await selectedOptions("Fay")).toEqual(["Arrive Saturday"]);
    });

    it("Re-importing adds options only in empty sets", async () => {
      const ana = await db.person.create({ firstName: "Ana", lastName: "Tester", email: "ana@example.org" });
      const applied = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: ana.id,
        roleId: (await findRole("Trip Participant")).id,
        status: "approved",
        participantCost: 1100,
      });
      await db.tripPeopleRoleOption.create({
        tripPeopleRoleId: applied.id,
        tripTravelOptionId: options.departFriday.id,
        selected: true,
      });

      await importRows([["Ana", "SP - Fri Barceló - Antigua"]]);

      expect(await selectedOptions("Ana")).toEqual(["Arrive Friday - Barceló", "Depart Friday"]);
      expect(await participantCost("Ana")).toBe(1175);
    });
  });
});
