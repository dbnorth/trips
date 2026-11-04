/**
 * Feature 112 — Application and Profile Status Messages
 * Spec: features/feature-112-application-profile-status-messages.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrganization,
  findRole,
  completePersonProfile,
  createDocumentType,
} from "./helpers.js";

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const daysBefore = (ymd, days) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
};

const createTrip = (orgId, fields = {}) =>
  db.trip.create({
    orgId,
    name: "Guatemala Clinic",
    status: "active",
    startDate: dateFromToday(120),
    endDate: dateFromToday(130),
    participantCost: 1800,
    requirePassport: true,
    ...fields,
  });

const createAssignment = async (tripId, peopleId, fields = {}) => {
  const role = await findRole("Trip Participant");
  return db.tripPeopleRole.create({ tripId, peopleId, roleId: role.id, ...fields });
};

const answeredApplication = {
  willSelfFund: true,
  flightPurchaseOption: "self",
  isPregnant: false,
};

const setupMaria = async () => {
  const org = await createOrganization("Hope Missions");
  const maria = await registerUser({
    email: "maria@example.com",
    firstName: "Maria",
    lastName: "Lopez",
    orgIds: [org.id],
  });
  await completePersonProfile(maria.user.personId);
  const rnLicense = await createDocumentType({
    orgId: org.id,
    type: "medical_license",
    description: "RN License",
    hasExpirationDate: true,
  });
  const nurse = await db.workerRole.create({ orgId: org.id, name: "Nurse" });
  await db.workerRoleDocumentType.create({ workerRoleId: nurse.id, documentTypeId: rnLicense.id });
  const trip = await createTrip(org.id);
  const tripWorkerRole = await db.tripWorkerRole.create({
    tripId: trip.id,
    workerRoleId: nurse.id,
    quantity: 2,
  });
  return { org, maria, rnLicense, nurse, trip, tripWorkerRole };
};

const nextActionsFor = async (maria, orgId, tripId) => {
  const res = await request(app).get("/trips/trips/browse/mine").query({ orgId }).set(maria.authHeader);
  expect(res.status).toBe(200);
  return res.body.find((t) => Number(t.id) === Number(tripId))?.nextActions;
};

const loadTripDocuments = async (maria) => {
  const res = await request(app).get("/trips/trips/browse/mine/documents").set(maria.authHeader);
  expect(res.status).toBe(200);
  return res.body;
};

describe("Feature 112 — Application and Profile Status Messages", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-112.1 — Know what to finish before submitting", () => {
    it("Next action flags", async () => {
      const { org, maria, trip, tripWorkerRole } = await setupMaria();
      await completePersonProfile(maria.user.personId, { city: null });
      const assignment = await createAssignment(trip.id, maria.user.personId, {
        status: "incomplete",
        tripWorkerRoleId: tripWorkerRole.id,
        ...answeredApplication,
      });

      expect(await nextActionsFor(maria, org.id, trip.id)).toEqual([
        { code: "complete-application", applicationIncomplete: false, profileIncomplete: true },
      ]);

      await completePersonProfile(maria.user.personId);
      await assignment.update({ willSelfFund: false });

      expect(await nextActionsFor(maria, org.id, trip.id)).toEqual([
        { code: "complete-application", applicationIncomplete: true, profileIncomplete: false },
      ]);
    });
  });

  describe("US-112.4 — Upload missing documents for a pre-approved application", () => {
    it("Pre-approved missing documents action has the due date", async () => {
      const { org, maria, trip, tripWorkerRole } = await setupMaria();
      await createAssignment(trip.id, maria.user.personId, {
        status: "pre_approved",
        tripWorkerRoleId: tripWorkerRole.id,
      });

      const [action] = await nextActionsFor(maria, org.id, trip.id);

      expect(action.code).toBe("upload-documents");
      expect(action.dueDate).toBe(daysBefore(trip.startDate, 90));
      expect(action.missingDocuments).toHaveLength(2);
      expect(action.missingDocuments[1]).toBe("Passport");
    });
  });

  describe("US-112.3 — See every document my upcoming trips need", () => {
    it("Required documents listed by trip", async () => {
      const { maria, rnLicense, trip, tripWorkerRole } = await setupMaria();
      await createAssignment(trip.id, maria.user.personId, {
        status: "incomplete",
        tripWorkerRoleId: tripWorkerRole.id,
      });
      await db.personDocument.create({
        personId: maria.user.personId,
        documentTypeId: rnLicense.id,
        countryIssued: "US",
        expirationDate: dateFromToday(400),
        documentFileName: "people/rn.png",
      });

      expect(await loadTripDocuments(maria)).toEqual([
        {
          tripId: trip.id,
          tripName: "Guatemala Clinic",
          startDate: trip.startDate,
          dueDate: daysBefore(trip.startDate, 90),
          documents: [
            { name: "RN License", uploaded: true, missingText: null },
            { name: "Passport", uploaded: false, missingText: "Passport" },
          ],
        },
      ]);
    });

    it("Cancelled, declined, and past trips are left out", async () => {
      const { org, maria, trip, tripWorkerRole } = await setupMaria();
      await createAssignment(trip.id, maria.user.personId, {
        status: "incomplete",
        tripWorkerRoleId: tripWorkerRole.id,
      });
      const cancelled = await createTrip(org.id, { name: "Cancelled Trip" });
      await createAssignment(cancelled.id, maria.user.personId, { status: "cancelled" });
      const declined = await createTrip(org.id, { name: "Declined Trip" });
      await createAssignment(declined.id, maria.user.personId, { status: "declined" });
      const started = await createTrip(org.id, {
        name: "Started Trip",
        startDate: dateFromToday(-1),
        endDate: dateFromToday(5),
      });
      await createAssignment(started.id, maria.user.personId, { status: "approved" });

      const trips = await loadTripDocuments(maria);

      expect(trips.map((t) => t.tripName)).toEqual(["Guatemala Clinic"]);
    });
  });
});
