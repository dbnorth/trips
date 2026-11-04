/**
 * Feature 117 — Email Type Event Description
 * Spec: features/feature-117-email-type-event-description.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createSystemAdminUser,
  createOrganization,
} from "./helpers.js";

const PAYMENT_DUE_DESCRIPTION =
  "This scheduled rule checks whether the Trip Participant's application is Approved and they still have a balance above $0 for the trip (total trip cost minus donations).";

describe("Feature 117 — Email Type Event Description", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-117.1 — Describe what an email type's event means", () => {
    it("Event description saved through the API", async () => {
      const { authHeader } = await createSystemAdminUser({ email: "sam@example.org" });

      const create = await request(app)
        .post("/trips/email-types")
        .set(authHeader)
        .send({
          typeCode: "trip-complete",
          description: "Trip complete",
          eventCode: "trip-complete",
          eventDescription: "  This event happens when staff mark a trip complete.  ",
        });
      expect(create.status).toBe(200);
      expect(create.body.eventDescription).toBe("This event happens when staff mark a trip complete.");

      const update = await request(app)
        .put(`/trips/email-types/${create.body.id}`)
        .set(authHeader)
        .send({
          typeCode: "trip-complete",
          description: "Trip complete",
          eventCode: "trip-complete",
          eventDescription: "   ",
        });
      expect(update.status).toBe(200);
      expect(update.body.eventDescription).toBeNull();

      await db.emailType.create({
        typeCode: "deposit-received",
        description: "Deposit received",
        eventCode: "deposit-received",
        eventDescription: "This event happens the first time the deposit is reached.",
      });
      const list = await request(app).get("/trips/email-types").set(authHeader);
      expect(list.status).toBe(200);
      expect(list.body.every((row) => "eventDescription" in row)).toBe(true);
      expect(list.body.find((row) => row.typeCode === "deposit-received").eventDescription).toBe(
        "This event happens the first time the deposit is reached."
      );
    });
  });

  describe("US-117.3 — See a template's event description on the templates list", () => {
    it("Template list includes the event description", async () => {
      const { authHeader } = await createSystemAdminUser({ email: "sam@example.org" });
      const org = await createOrganization("Hope Missions");
      const type = await db.emailType.create({
        typeCode: "deposit-received",
        description: "Deposit received",
        eventCode: "deposit-received",
        eventDescription: "This event happens the first time the deposit is reached.",
      });
      await db.emailTemplate.create({
        orgId: org.id,
        emailTypeId: type.id,
        functionCode: "Send Now",
        subject: "Deposit thanks",
        fromEmail: "trips@example.org",
        toAddress: "{{PARTICIPANT_EMAIL}}",
        emailBody: "Thank you.",
      });

      const res = await request(app)
        .get("/trips/email-templates")
        .set(authHeader)
        .set("x-acting-organization-id", String(org.id));

      expect(res.status).toBe(200);
      const template = res.body.find((t) => t.subject === "Deposit thanks");
      expect(template.emailType.eventDescription).toBe("This event happens the first time the deposit is reached.");
    });
  });

  describe("US-117.2 — Seeded email types come with descriptions", () => {
    it("Seed fills blank event descriptions", async () => {
      await db.emailType.create({
        typeCode: "payment-due",
        description: "Payment due reminder",
        eventCode: "payment-due",
      });

      await seedEmailTypes();

      const paymentDue = await db.emailType.findOne({ where: { typeCode: "payment-due" } });
      expect(paymentDue.eventDescription).toBe(PAYMENT_DUE_DESCRIPTION);
      const all = await db.emailType.findAll();
      expect(all.length).toBeGreaterThan(1);
      expect(all.every((row) => String(row.eventDescription || "").trim() !== "")).toBe(true);
    });

    it("Seed keeps an admin's event description", async () => {
      await db.emailType.create({
        typeCode: "apply-started",
        description: "Application started",
        eventCode: "application-started",
        eventDescription: "Sent when someone starts an application.",
      });
      await db.emailType.create({
        typeCode: "trip-complete",
        description: "Trip complete",
        eventCode: "trip-complete",
      });

      await seedEmailTypes();

      const started = await db.emailType.findOne({ where: { typeCode: "apply-started" } });
      expect(started.eventDescription).toBe("Sent when someone starts an application.");
      const custom = await db.emailType.findOne({ where: { typeCode: "trip-complete" } });
      expect(custom.eventDescription).toBeNull();
    });
  });
});
