/**
 * Feature 85 — Agent Role
 * Spec: features/feature-85-agent-role.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import ensureSchema from "../app/scripts/ensureSchema.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  createOrganization,
  findRole,
  completePersonProfile,
} from "./helpers.js";

const createTrip = async (authHeader, orgId, name) => {
  const trip = await request(app)
    .post("/trips/trips")
    .set(authHeader)
    .send({ orgId, name, status: "active", startDate: "2027-03-01", endDate: "2027-03-10" });
  expect(trip.status).toBe(200);
  return trip.body;
};

/** Hope Missions trip with approved participant Ana, a Grace Church trip, and Alex as Agent of Hope Missions. */
const setup = async () => {
  await ensureSchema();
  const sys = await createSystemAdminUser({ email: "agent-sys@example.com" });
  const hope = await createOrgAdminUser({ email: "agent-hope-admin@example.com", orgName: "Hope Missions" });
  const grace = await createOrgAdminUser({ email: "agent-grace-admin@example.com", orgName: "Grace Church" });

  const guatemala = await createTrip(hope.authHeader, hope.org.id, "Guatemala Clinic 2027");
  const peru = await createTrip(grace.authHeader, grace.org.id, "Peru Build 2027");

  const ana = await registerUser({
    email: "agent-ana@example.com",
    firstName: "Ana",
    lastName: "Lopez",
    orgIds: [hope.org.id],
  });
  await completePersonProfile(ana.user.personId);
  const participantRole = await findRole("Trip Participant");
  const anaAssignment = await request(app)
    .post("/trips/trip-people-roles")
    .set(hope.authHeader)
    .send({
      tripId: guatemala.id,
      peopleId: ana.user.personId,
      roleId: participantRole.id,
      status: "approved",
      willSelfFund: true,
    });
  expect(anaAssignment.status).toBe(200);

  const airport = await request(app)
    .post("/trips/airports")
    .set(sys.authHeader)
    .send({ code: "BNA", airportName: "Nashville Intl", city: "Nashville", country: "US" });
  expect(airport.status).toBe(200);
  const gua = await request(app)
    .post("/trips/airports")
    .set(sys.authHeader)
    .send({ code: "GUA", airportName: "La Aurora", city: "Guatemala City", country: "GT" });
  expect(gua.status).toBe(200);
  const airline = await request(app)
    .post("/trips/airlines")
    .set(sys.authHeader)
    .send({ code: "AA", name: "American Airlines" });
  expect(airline.status).toBe(200);

  const alex = await registerUser({ email: "agent-alex@example.com", firstName: "Alex", lastName: "Agent" });
  const agentRole = await findRole("Agent");
  const assign = await request(app)
    .post("/trips/org-people-roles")
    .set(sys.authHeader)
    .send({ orgId: hope.org.id, peopleId: alex.user.personId, roleId: agentRole.id });
  expect(assign.status).toBe(200);

  return { sys, hope, grace, guatemala, peru, ana, anaAssignment: anaAssignment.body, alex };
};

describe("Feature 85 — Agent Role", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-85.1 — A System Admin makes someone an Agent", () => {
    it("The Agent role can be given to a person in an organization", async () => {
      expect(await findRole("Agent")).toBeNull();
      await ensureSchema();

      const sys = await createSystemAdminUser({ email: "agent-role-sys@example.com" });
      const roles = await request(app).get("/trips/roles").set(sys.authHeader);
      expect(roles.status).toBe(200);
      const agentRole = roles.body.find((r) => r.roleName === "Agent");
      expect(agentRole).toMatchObject({ roleDescription: "Books flights for the organization's trips" });

      const hope = await createOrganization("Hope Missions");
      const alex = await registerUser({ email: "agent-role-alex@example.com", firstName: "Alex", lastName: "Agent" });
      const assign = await request(app)
        .post("/trips/org-people-roles")
        .set(sys.authHeader)
        .send({ orgId: hope.id, peopleId: alex.user.personId, roleId: agentRole.id });
      expect(assign.status).toBe(200);

      const saved = await db.orgPeopleRole.findAll({ where: { peopleId: alex.user.personId } });
      expect(saved.map((r) => [r.orgId, r.roleId])).toContainEqual([hope.id, agentRole.id]);
    });
  });

  describe("US-85.3 — An Agent books flights on the Flights page", () => {
    it("An Agent books flights for the organization's trips", async () => {
      const { guatemala, peru, anaAssignment, alex } = await setup();

      const list = await request(app).get("/trips/trips").set(alex.authHeader);
      expect(list.status).toBe(200);
      expect(list.body.map((t) => t.name)).toEqual(["Guatemala Clinic 2027"]);
      expect(list.body.map((t) => t.id)).not.toContain(peru.id);

      const flights = await request(app).get(`/trips/trips/${guatemala.id}/flights`).set(alex.authHeader);
      expect(flights.status).toBe(200);
      expect(flights.body.participants.map((p) => p.firstName)).toEqual(["Ana"]);

      const header = await request(app)
        .put(`/trips/trips/${guatemala.id}/flights/${anaAssignment.id}`)
        .set(alex.authHeader)
        .send({ purchased: true, cost: 650, comments: "Booked on AA" });
      expect(header.status).toBe(200);

      const segments = await request(app)
        .put(`/trips/trips/${guatemala.id}/flights/${anaAssignment.id}/segments`)
        .set(alex.authHeader)
        .send({
          segments: [
            {
              segmentType: "arrival",
              segmentNumber: 1,
              departureAirportCode: "BNA",
              airlineCode: "AA",
              flightNumber: "100",
              departureDate: "2027-03-01",
              departureTime: "08:00",
              arrivalAirportCode: "GUA",
              arrivalDate: "2027-03-01",
              arrivalTime: "13:00",
            },
          ],
        });
      expect(segments.status).toBe(200);

      const readBack = await request(app)
        .get(`/trips/trips/${guatemala.id}/flights/${anaAssignment.id}/segments`)
        .set(alex.authHeader);
      expect(readBack.status).toBe(200);
      expect(readBack.body.segments).toHaveLength(1);
      expect(readBack.body.segments[0]).toMatchObject({ flightNumber: "100" });

      const reload = await request(app).get(`/trips/trips/${guatemala.id}/flights`).set(alex.authHeader);
      expect(reload.body.participants[0]).toMatchObject({ cost: 650, comments: "Booked on AA" });

      const pdf = await request(app).get(`/trips/trips/${guatemala.id}/flights/pdf`).set(alex.authHeader);
      expect(pdf.status).toBe(200);
      expect(pdf.headers["content-type"]).toMatch(/application\/pdf/);
    });

    it("An Agent can't open another organization's flights", async () => {
      const { peru, alex } = await setup();

      const flights = await request(app).get(`/trips/trips/${peru.id}/flights`).set(alex.authHeader);
      expect([403, 404]).toContain(flights.status);

      const pdf = await request(app).get(`/trips/trips/${peru.id}/flights/pdf`).set(alex.authHeader);
      expect([403, 404]).toContain(pdf.status);
    });

    it("An Agent gets nothing else on the trip", async () => {
      const { guatemala, alex } = await setup();

      const detail = await request(app).get(`/trips/trips/${guatemala.id}`).set(alex.authHeader);
      expect([403, 404]).toContain(detail.status);

      const status = await request(app).get(`/trips/trips/${guatemala.id}/status`).set(alex.authHeader);
      expect([403, 404]).toContain(status.status);

      const roster = await request(app)
        .get("/trips/trip-people-roles")
        .query({ tripId: guatemala.id })
        .set(alex.authHeader);
      expect([403, 404]).toContain(roster.status);
    });
  });
});
