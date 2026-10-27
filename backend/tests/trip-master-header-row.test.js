/**
 * Feature 90 — Trip Master Header Row
 * Spec: features/feature-90-trip-master-header-row.md
 */

import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser, createOrgAdminUser, findRole } from "./helpers.js";

const SAMPLE_LINES = fs.readFileSync(path.resolve("tests/fixtures/trip-master-sample.csv"), "utf8").split("\n");

describe("Feature 90 — Trip Master Header Row", () => {
  let omar;
  let trip;

  const importLines = (lines) =>
    request(app)
      .post(`/trips/trips/${trip.id}/import-trip-master`)
      .set(omar.authHeader)
      .attach("file", Buffer.from(lines.join("\n")), { filename: "trip-master.csv", contentType: "text/csv" });

  /** The Feature 80 sample's summary, with its notes on the given spreadsheet rows. */
  const sampleSummary = (waitingListRow, cancelledRow) => ({
    rowCount: 6,
    added: 4,
    updated: 1,
    skipped: 1,
    notes: [
      { row: waitingListRow, name: "Jack Lawler", message: "On the waiting list." },
      {
        row: cancelledRow,
        name: "Andrea Fletcher",
        message: 'travel notes "Fri or Sat" match more than one option in Trip Option 2.',
      },
    ],
  });

  const assignedPeople = async () =>
    (
      await db.tripPeopleRole.findAll({
        where: { tripId: trip.id },
        include: [{ model: db.person, as: "person" }],
      })
    )
      .map((row) => `${row.person.firstName} ${row.person.lastName} ${row.status}`)
      .sort();

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    omar = await createOrgAdminUser({ email: "omar@example.org", orgName: "Hope Missions" });
    const org = omar.org;
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic 2027",
      location: "Antigua",
      status: "active",
      startDate: "2027-06-10",
      endDate: "2027-06-17",
      participantCost: 950,
    });
    for (const [description, setNumber, priceAdjustment] of [
      ["Need HTI Name Tag", 1, 0],
      ["Arrive Friday - Barceló Bar", 2, 75],
      ["Arrive Saturday", 2, 0],
      ["HTI Purchase Flights", 3, 40],
    ]) {
      await db.tripTravelOption.create({ tripId: trip.id, description, setNumber, priceAdjustment });
    }
    const surgeon = await db.workerRole.create({ orgId: org.id, name: "General Surgeon" });
    await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: surgeon.id, quantity: 1 });
    const circulator = await db.workerRole.create({ orgId: org.id, name: "RN Circulator" });
    await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: circulator.id, quantity: 2 });
    await db.documentType.create({ orgId: org.id, description: "Passport", type: "passport" });
    await db.person.create({
      firstName: "Ana",
      lastName: "Lopez",
      email: "ana@example.org",
      phoneContryCode: "1",
      phoneNumber: "6155550100",
    });
    const tom = await registerUser({ email: "tom@example.org", firstName: "Tom", lastName: "Reyes", orgIds: [org.id] });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: tom.user.personId,
      roleId: (await findRole("Trip Leader")).id,
      status: "approved",
    });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-90.1 — The import finds the column header wherever it starts", () => {
    it("A file without the title row imports", async () => {
      const res = await importLines(SAMPLE_LINES.slice(1));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleSummary(12, 15));
      expect(await assignedPeople()).toEqual([
        "Ana Lopez approved",
        "Andrea Fletcher cancelled",
        "Kris Smith incomplete",
        "Lyle Lowry approved",
        "Rick Harper approved",
        "Tom Reyes approved",
      ]);
    });

    it("A blank line before the header is skipped", async () => {
      const blank = await importLines(["", ...SAMPLE_LINES.slice(1)]);

      expect(blank.status).toBe(200);
      expect(blank.body).toEqual(sampleSummary(13, 16));

      await resetTestDatabase();
      omar = await createOrgAdminUser({ email: "omar2@example.org", orgName: "Hope Missions 2" });
      trip = await db.trip.create({ orgId: omar.org.id, name: "Guatemala Clinic 2027", status: "active" });
      for (const name of ["General Surgeon", "RN Circulator"]) {
        const role = await db.workerRole.create({ orgId: omar.org.id, name });
        await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: role.id, quantity: 2 });
      }

      const commas = await importLines([",,,,,,,,,,", ...SAMPLE_LINES.slice(1)]);

      expect(commas.status).toBe(200);
      expect(commas.body).toMatchObject({ rowCount: 6, skipped: 1 });
      expect(commas.body.notes).toContainEqual({ row: 13, name: "Jack Lawler", message: "On the waiting list." });
    });

    it("Several lines before the header are skipped", async () => {
      const res = await importLines([SAMPLE_LINES[0], "", ...SAMPLE_LINES.slice(1)]);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleSummary(14, 17));
    });
  });
});
