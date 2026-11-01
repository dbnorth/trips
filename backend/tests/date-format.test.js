/**
 * Feature 101 — MM/DD/YYYY Dates
 * Spec: features/feature-101-mm-dd-yyyy-dates.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { buildRoomListData } from "../app/utils/roomListPdf.js";
import { syncTestDatabase, resetTestDatabase, createOrgAdminUser, findRole } from "./helpers.js";

describe("Feature 101 — MM/DD/YYYY Dates", () => {
  let admin;
  let trip;
  let ana;
  let anaAssignment;
  const savedTimeZone = process.env.SCHEDULED_EMAIL_TIMEZONE;

  beforeAll(async () => {
    await syncTestDatabase();
    process.env.SCHEDULED_EMAIL_TIMEZONE = "America/Chicago";
  });

  beforeEach(async () => {
    admin = await createOrgAdminUser({ email: "admin@example.org", orgName: "Hope Mission" });
    trip = await db.trip.create({
      orgId: admin.org.id,
      name: "Guatemala Clinic 2027",
      location: "Antigua",
      country: "Guatemala",
      startDate: "2027-03-01",
      endDate: "2027-03-10",
      status: "active",
    });
    ana = await db.person.create({
      firstName: "Ana",
      lastName: "Lopez",
      email: "ana@example.org",
      birthDate: "1990-05-15",
    });
    anaAssignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ana.id,
      roleId: (await findRole("Trip Participant")).id,
      status: "approved",
    });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    if (savedTimeZone === undefined) delete process.env.SCHEDULED_EMAIL_TIMEZONE;
    else process.env.SCHEDULED_EMAIL_TIMEZONE = savedTimeZone;
    await db.sequelize.close();
  });

  describe("US-101.2 — Emails, PDFs, and CSV files use MM/DD/YYYY", () => {
    it("Date tokens fill as MM/DD/YYYY", async () => {
      await seedEmailTokens();

      const preview = await request(app)
        .post("/trips/email-templates/preview")
        .set(admin.authHeader)
        .send({
          orgId: admin.org.id,
          tripId: trip.id,
          personId: ana.id,
          subject: "Dates",
          emailBody: "{{TRIP_START_DATE}} | {{TRIP_END_DATE}} | {{PARTICIPANT_ARRIVAL_DATE}}",
        });

      expect(preview.status).toBe(200);
      expect(preview.body.emailBody).toBe("03/01/2027 | 03/10/2027 | 03/01/2027");
    });

    it("PDF dates are MM/DD/YYYY", async () => {
      const passportType = await db.documentType.create({
        orgId: admin.org.id,
        description: "Passport",
        type: "passport",
      });
      await db.personDocument.create({
        personId: ana.id,
        documentTypeId: passportType.id,
        documentNumber: "P1234567",
        expirationDate: "2030-05-03",
        countryIssued: "US",
      });
      const roomingList = await db.tripRoomingList.create({
        tripId: trip.id,
        hotelName: "Hotel Casa Santo Domingo",
        checkInDate: "2027-03-01",
      });
      const room = await db.tripRoom.create({
        tripRoomingListId: roomingList.id,
        roomNumber: "12",
        roomType: "Double",
        numberOfNights: 9,
      });
      await db.tripRoomAssignment.create({ tripRoomId: room.id, tripPeopleRoleId: anaAssignment.id });

      const data = await buildRoomListData(trip.id);

      expect(data.trip.dates).toBe("03/01/2027 to 03/10/2027");
      expect(data.hotel.checkInDate).toBe("03/01/2027");
      expect(data.rows[0].passportExpiration).toBe("05/03/2030");
    });

    it("CSV dates are MM/DD/YYYY", async () => {
      await anaAssignment.update({ agreementDate: new Date("2027-01-05T15:05:00Z") });
      await db.tripDonation.create({
        tripId: trip.id,
        personId: ana.id,
        amount: 50,
        dateTime: new Date("2027-01-15T20:30:00Z"),
      });

      const participants = await request(app)
        .get(`/trips/export/trips/${trip.id}/participants.csv`)
        .set(admin.authHeader);
      const donations = await request(app)
        .get(`/trips/export/trips/${trip.id}/donations.csv`)
        .set(admin.authHeader);

      expect(participants.status).toBe(200);
      expect(participants.text).toContain(",05/15/1990,");
      expect(participants.text).toContain(",01/05/2027 9:05 AM,");
      expect(donations.status).toBe(200);
      expect(donations.text).toContain(",01/15/2027 2:30 PM,");
    });
  });
});
