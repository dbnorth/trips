/**
 * Feature 118 — Email Report
 * Spec: features/feature-118-email-report.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { buildEmailReportData, renderEmailReportPdf } from "../app/utils/emailReportPdf.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  createOrganization,
  findRole,
} from "./helpers.js";

const DEPOSIT_RECEIVED =
  "This event happens the first time the donations recorded for a Trip Participant on a trip reach or exceed the trip deposit amount.";
const PAYMENT_DUE =
  "This scheduled rule checks whether the Trip Participant's application is Approved and they still have a balance above $0 for the trip (total trip cost minus donations).";

const binaryParser = (res, callback) => {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

describe("Feature 118 — Email Report", () => {
  let olivia;
  let hope;
  let trip;

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    olivia = await createOrgAdminUser({ email: "olivia@example.org", orgName: "Hope Missions" });
    hope = olivia.org;
    trip = await db.trip.create({ orgId: hope.id, name: "Guatemala Clinic", status: "active" });

    const type = (typeCode, description, eventDescription) =>
      db.emailType.create({ typeCode, description, eventCode: typeCode, eventDescription });
    const deposit = await type("deposit-received", "Deposit received", DEPOSIT_RECEIVED);
    const payment = await type("payment-due", "Payment due reminder", PAYMENT_DUE);
    const team = await type("team-update", "Trip team update", null);

    const template = (fields) =>
      db.emailTemplate.create({ fromEmail: "trips@example.org", toAddress: "{{PARTICIPANT_EMAIL}}", ...fields });
    await template({ orgId: hope.id, functionCode: "Scheduled", scheduleRule: "weekly", emailTypeId: payment.id, subject: "Your balance" });
    await template({
      orgId: hope.id,
      tripId: trip.id,
      functionCode: "Scheduled",
      scheduleRule: "before-start",
      scheduleDaysBefore: 5,
      emailTypeId: payment.id,
      subject: "Almost time",
    });
    await template({ orgId: hope.id, functionCode: "Send Now", emailTypeId: deposit.id, subject: "Deposit received - thank you" });
    await template({ orgId: hope.id, functionCode: "Trip Participant", emailTypeId: team.id, subject: "Team news" });

    const peru = await createOrganization("Peru Outreach");
    await template({ orgId: peru.id, functionCode: "Send Now", emailTypeId: deposit.id, subject: "Peru only" });
    await template({ orgId: null, functionCode: "Send Now", emailTypeId: deposit.id, subject: "Master template" });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-118.1 — Download an organization's email report", () => {
    it("Email report lists the organization's templates by function code", async () => {
      const data = await buildEmailReportData(hope.id);

      expect(data.organization.name).toBe("Hope Missions");
      expect(data.groups.map((g) => g.functionCode)).toEqual(["Scheduled", "Send Now", "Trip Participant"]);
      expect(data.groups[0].rows).toEqual([
        {
          subject: "Almost time",
          emailType: "Payment due reminder",
          whenSent: "5 days before trip start",
          trip: "Guatemala Clinic",
          eventDescription: PAYMENT_DUE,
        },
        {
          subject: "Your balance",
          emailType: "Payment due reminder",
          whenSent: "Weekly (Tuesday)",
          trip: "All trips",
          eventDescription: PAYMENT_DUE,
        },
      ]);
      expect(data.groups[1].rows).toEqual([
        {
          subject: "Deposit received - thank you",
          emailType: "Deposit received",
          whenSent: "On Event",
          trip: "All trips",
          eventDescription: DEPOSIT_RECEIVED,
        },
      ]);
      expect(data.groups[2].rows).toEqual([
        {
          subject: "Team news",
          emailType: "Trip team update",
          whenSent: "Manual",
          trip: "All trips",
          eventDescription: "No event description.",
        },
      ]);
      const subjects = data.groups.flatMap((g) => g.rows.map((r) => r.subject));
      expect(subjects).not.toContain("Peru only");
      expect(subjects).not.toContain("Master template");

      const pdf = await renderEmailReportPdf(data);
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    });

    it("Org Admin downloads the email report PDF", async () => {
      const res = await request(app)
        .get("/trips/email-templates/report/pdf")
        .set(olivia.authHeader)
        .set("x-acting-organization-id", String(hope.id))
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/pdf/);
      expect(res.headers["content-disposition"]).toContain('filename="Email Report - Hope Missions.pdf"');
      expect(res.body.subarray(0, 4).toString()).toBe("%PDF");
    });

    it("Only System Admins and Org Admins can download the email report", async () => {
      const tom = await registerUser({ email: "tom@example.org", firstName: "Tom", orgIds: [hope.id] });
      await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: tom.user.personId,
        roleId: (await findRole("Trip Leader")).id,
        status: "approved",
      });

      const asTom = await request(app)
        .get("/trips/email-templates/report/pdf")
        .set(tom.authHeader)
        .set("x-acting-organization-id", String(hope.id));
      expect(asTom.status).toBe(403);

      const sam = await createSystemAdminUser({ email: "sam@example.org" });
      const noOrg = await request(app).get("/trips/email-templates/report/pdf").set(sam.authHeader);
      expect(noOrg.status).toBe(400);
      expect(noOrg.body.message).toBe("Select an organization.");

      const withOrg = await request(app)
        .get("/trips/email-templates/report/pdf")
        .set(sam.authHeader)
        .set("x-acting-organization-id", String(hope.id))
        .buffer(true)
        .parse(binaryParser);
      expect(withOrg.status).toBe(200);
    });
  });
});
