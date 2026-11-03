/**
 * Feature 104 — Pre-Approved Status and Document Review
 * Spec: features/feature-104-pre-approved-document-review.md
 */

import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import ensureSchema from "../app/scripts/ensureSchema.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  assignOrgRole,
  findRole,
  completePersonProfile,
  createDocumentType,
  TINY_PNG,
} from "./helpers.js";

const APPROVAL_DOCUMENTS_MESSAGE = "Upload and review all required documents before approving.";

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const applicationBody = (tripWorkerRoleId) => ({
  tripWorkerRoleId,
  willSelfFund: true,
  flightPurchaseOption: "self",
  willRaiseFunds: false,
  hasPreferredRoommate: false,
  isPregnant: false,
  agreementAccepted: true,
  agreementSignatureName: "Ana Lopez",
});

describe("Feature 104 — Pre-Approved Status and Document Review", () => {
  let admin;
  let org;
  let omar;
  let ana;
  let trip;
  let tripWorkerRole;
  let rnLicence;
  let passport;
  let specializations;

  /**
   * Hope Mission runs "Guatemala Clinic 2027" with Require Passport; its Nurse role requires an
   * RN Licence. Ana Lopez has a complete profile; Omar Diaz is the trip's Trip Leader.
   */
  const setup = async ({ startDate = "2027-03-01", endDate = "2027-03-10", requiredSpecializations = [] } = {}) => {
    admin = await createOrgAdminUser({ email: "hope-admin@example.org", orgName: "Hope Mission" });
    org = admin.org;
    omar = await registerUser({ email: "omar@example.org", firstName: "Omar", lastName: "Diaz", orgIds: [org.id] });
    await assignOrgRole(org.id, omar.user.personId, "Trip Leader");
    rnLicence = await createDocumentType({
      orgId: org.id,
      type: "medical_licence",
      description: "RN Licence",
      allowSpecialization: true,
    });
    specializations = {};
    for (const name of requiredSpecializations) {
      specializations[name] = await db.documentTypeSpecialization.create({ documentTypeId: rnLicence.id, name });
    }
    passport = await createDocumentType({
      orgId: org.id,
      type: "passport",
      description: "Passport",
      documentNumberRequired: true,
      hasExpirationDate: true,
    });
    const tripRes = await request(app)
      .post("/trips/trips")
      .set(admin.authHeader)
      .send({
        orgId: org.id,
        name: "Guatemala Clinic 2027",
        status: "active",
        startDate,
        endDate,
        participantCost: 1800,
        requirePassport: true,
        leaderPeopleIds: [omar.user.personId],
      });
    expect(tripRes.status).toBe(200);
    trip = tripRes.body;
    const nurse = await request(app)
      .post("/trips/worker-roles")
      .set(admin.authHeader)
      .send({
        orgId: org.id,
        name: "Nurse",
        requiredDocumentTypeIds: [rnLicence.id],
        requiredSpecializationIds: Object.values(specializations).map((s) => s.id),
      });
    expect(nurse.status).toBe(200);
    const twr = await request(app)
      .post("/trips/trip-worker-roles")
      .set(admin.authHeader)
      .send({ tripId: trip.id, workerRoleId: nurse.body.id, quantity: 2 });
    expect(twr.status).toBe(200);
    tripWorkerRole = twr.body;
    ana = await registerUser({ email: "ana@example.org", firstName: "Ana", lastName: "Lopez", orgIds: [org.id] });
    await completePersonProfile(ana.user.personId);
  };

  const apply = () =>
    request(app)
      .post(`/trips/trips/browse/${trip.id}/apply`)
      .set(ana.authHeader)
      .send(applicationBody(tripWorkerRole.id));

  const addDocument = (documentType, fields = {}) =>
    db.personDocument.create({
      personId: ana.user.personId,
      documentTypeId: documentType.id,
      countryIssued: "US",
      expirationDate: "2030-01-01",
      documentFileName: `people/${documentType.description}.png`,
      ...fields,
    });

  const approve = async (user, assignmentId) => {
    const row = await db.tripPeopleRole.findByPk(assignmentId);
    return request(app)
      .put(`/trips/trip-people-roles/${assignmentId}`)
      .set(user.authHeader)
      .send({ status: "approved", version: row.version });
  };

  const markReviewed = (user, assignmentId, documentId, reviewed = true) =>
    request(app)
      .put(`/trips/trip-people-roles/${assignmentId}/documents/${documentId}/reviewed`)
      .set(user.authHeader)
      .send({ reviewed });

  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-104.1 — Applications are Pre-Approved without documents", () => {
    it("Existing Applied applications become Pre-Approved", async () => {
      await setup();
      await db.sequelize.query(
        `ALTER TABLE tripPeopleRoles MODIFY COLUMN status
         ENUM('incomplete', 'applied', 'approved', 'declined', 'cancelled') NOT NULL DEFAULT 'incomplete'`
      );
      const row = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: ana.user.personId,
        roleId: (await findRole("Trip Participant")).id,
        tripWorkerRoleId: tripWorkerRole.id,
        status: "incomplete",
      });
      await db.sequelize.query(`UPDATE tripPeopleRoles SET status = 'applied' WHERE id = ${row.id}`);

      await ensureSchema();

      await row.reload();
      expect(row.status).toBe("pre_approved");
    });

    it("An application without documents is Pre-Approved", async () => {
      await setup();
      const emailType = await db.emailType.create({
        typeCode: "application-submitted",
        description: "Application received",
        eventCode: "application-submitted",
      });
      await db.emailToken.create({
        tokenCode: "PARTICIPANT_EMAIL",
        description: "Participant email",
        valueSource: "participant.email",
      });
      await db.emailTemplate.create({
        orgId: org.id,
        tripId: null,
        emailTypeId: emailType.id,
        functionCode: "Send Now",
        fromEmail: "office@example.org",
        toAddress: "{{PARTICIPANT_EMAIL}}",
        subject: "Application received",
        emailBody: "Hello.",
      });

      const res = await apply();

      expect(res.status).toBe(200);
      expect(res.body.applicationStatus).toBe("pre_approved");
      const sent = await db.emailLog.findAll({ where: { subject: { [Op.ne]: "Login" } } });
      expect(sent.map((log) => log.subject)).toEqual(["Application received"]);
    });

    it("My Trips tells a Pre-Approved participant to upload documents", async () => {
      await setup({ startDate: dateFromToday(60), endDate: dateFromToday(70) });
      expect((await apply()).body.applicationStatus).toBe("pre_approved");

      const mine = await request(app)
        .get("/trips/trips/browse/mine")
        .query({ orgId: org.id })
        .set(ana.authHeader);

      expect(mine.status).toBe(200);
      const [action] = mine.body.find((t) => Number(t.id) === Number(trip.id)).nextActions;
      expect(action.code).toBe("upload-documents");
      expect(action.missingDocuments).toHaveLength(2);
      expect(action.missingDocuments[0]).toMatch(/^RN Licence: add this document/);
      expect(action.missingDocuments[1]).toBe("Passport");
    });

    it("The Trip Master import adds received applications as Pre-Approved", async () => {
      await setup();
      const csv = [
        "Position Required,App,E-Mail,First,Last",
        "In Yellow,Received,,Name,Name",
        "Nurse,X,ana@example.org,Ana,Lopez",
        "Nurse,,kris@example.org,Kris,Smith",
        "Team Leader,,omar@example.org,Omar,Diaz",
        "Total,,,,",
      ].join("\n");

      const res = await request(app)
        .post(`/trips/trips/${trip.id}/import-trip-master`)
        .set(admin.authHeader)
        .attach("file", Buffer.from(csv), { filename: "trip-master.csv", contentType: "text/csv" });

      expect(res.status).toBe(200);
      const rows = await db.tripPeopleRole.findAll({
        where: { tripId: trip.id },
        include: [
          { model: db.person, as: "person" },
          { model: db.role, as: "role" },
        ],
      });
      const statusOf = (firstName) => {
        const row = rows.find((r) => r.person.firstName === firstName);
        return [row.role.roleName, row.status];
      };
      expect(statusOf("Ana")).toEqual(["Trip Participant", "pre_approved"]);
      expect(statusOf("Kris")).toEqual(["Trip Participant", "incomplete"]);
      expect(statusOf("Omar")).toEqual(["Trip Leader", "approved"]);
    });
  });

  describe("US-104.2 — Approval needs uploaded, reviewed documents", () => {
    it("Approve is refused until required documents are uploaded and reviewed", async () => {
      await setup();
      const applied = await apply();
      expect(applied.body.applicationStatus).toBe("pre_approved");
      const assignmentId = applied.body.assignment.id;
      const passportDoc = await addDocument(passport, { documentNumber: "P123", issueDate: "2020-06-01" });
      const licenceDoc = await addDocument(rnLicence);

      const refused = await approve(omar, assignmentId);
      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe(APPROVAL_DOCUMENTS_MESSAGE);
      expect((await db.tripPeopleRole.findByPk(assignmentId)).status).toBe("pre_approved");

      const review = await request(app)
        .get(`/trips/trip-people-roles/${assignmentId}/document-review`)
        .set(omar.authHeader);
      expect(review.status).toBe(200);
      expect(review.body.approvalBlockers).toEqual(["RN Licence: not reviewed", "Passport: not reviewed"]);
      const passportEntry = review.body.requirements.find((r) => r.key === "passport").documents[0];
      expect(passportEntry).toMatchObject({
        documentNumber: "P123",
        issueDate: "2020-06-01",
        expirationDate: "2030-01-01",
        documentNumberRequired: true,
        hasExpirationDate: true,
      });

      expect((await markReviewed(omar, assignmentId, passportDoc.id)).status).toBe(200);
      expect((await markReviewed(omar, assignmentId, licenceDoc.id)).status).toBe(200);

      const approved = await approve(omar, assignmentId);
      expect(approved.status).toBe(200);
      expect(approved.body.status).toBe("approved");
    });
  });

  describe("US-104.3 — Staff review a participant's required documents", () => {
    it("Only trip staff can mark documents reviewed", async () => {
      await setup();
      const applied = await apply();
      const assignmentId = applied.body.assignment.id;
      const passportDoc = await addDocument(passport);

      const otherLeader = await registerUser({
        email: "lee@example.org",
        firstName: "Lee",
        lastName: "Park",
        orgIds: [org.id],
      });
      await assignOrgRole(org.id, otherLeader.user.personId, "Trip Leader");
      const otherTrip = await request(app)
        .post("/trips/trips")
        .set(admin.authHeader)
        .send({
          orgId: org.id,
          name: "Honduras Clinic 2027",
          status: "active",
          startDate: "2027-05-01",
          endDate: "2027-05-10",
          leaderPeopleIds: [otherLeader.user.personId],
        });
      expect(otherTrip.status).toBe(200);

      for (const user of [ana, otherLeader]) {
        const res = await markReviewed(user, assignmentId, passportDoc.id);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden.");
      }
      expect((await db.personDocument.findByPk(passportDoc.id)).reviewed).toBe(false);
    });

    it("The review shows the role and the licence's required specializations", async () => {
      await setup({ requiredSpecializations: ["Pediatrics", "Emergency"] });
      const applied = await apply();
      const assignmentId = applied.body.assignment.id;
      const licenceDoc = await addDocument(rnLicence);
      const added = await db.personDocumentSpecialization.create({
        personDocumentId: licenceDoc.id,
        documentTypeSpecializationId: specializations.Pediatrics.id,
        specializationDate: "2024-04-15",
        documentFileName: "people/pediatrics.png",
      });

      const review = await request(app)
        .get(`/trips/trip-people-roles/${assignmentId}/document-review`)
        .set(omar.authHeader);
      expect(review.status).toBe(200);
      expect(review.body.workerRoleName).toBe("Nurse");
      const licence = review.body.requirements.find((r) => r.label === "RN Licence");
      expect(licence.requiredSpecializations.map((s) => s.name)).toEqual(["Emergency", "Pediatrics"]);
      expect(licence.documents[0].specializations).toEqual([
        {
          id: added.id,
          documentTypeSpecializationId: specializations.Pediatrics.id,
          name: "Pediatrics",
          date: "2024-04-15",
          hasFile: true,
        },
      ]);
      expect(review.body.requirements.find((r) => r.key === "passport").requiredSpecializations).toEqual([]);

      const viewPath = (specializationId) =>
        `/trips/trip-people-roles/${assignmentId}/documents/${licenceDoc.id}/specializations/${specializationId}/view`;
      const forbidden = await request(app).get(viewPath(added.id)).set(ana.authHeader);
      expect(forbidden.status).toBe(403);
      const missing = await request(app).get(viewPath(added.id + 999)).set(omar.authHeader);
      expect(missing.status).toBe(404);
      expect(missing.body.message).toBe("Specialization not found.");
    });

    it("Changing a reviewed document clears Reviewed", async () => {
      await setup();
      const passportDoc = await addDocument(passport, {
        documentNumber: "P123",
        issueDate: "2020-06-01",
        reviewed: true,
      });
      const update = (attach) => {
        const req = request(app)
          .put(`/trips/people/${ana.user.personId}/documents/${passportDoc.id}`)
          .set(ana.authHeader)
          .field("documentTypeId", String(passport.id))
          .field("countryIssued", "US")
          .field("documentNumber", "P123")
          .field("issueDate", "2020-06-01")
          .field("expirationDate", "2030-01-01");
        return attach ? req.attach("document", TINY_PNG, { filename: "new.png", contentType: "image/png" }) : req;
      };

      expect((await update(false)).status).toBe(200);
      expect((await db.personDocument.findByPk(passportDoc.id)).reviewed).toBe(true);

      const replaced = await update(true);
      expect(replaced.status).toBe(200);
      expect(replaced.body.reviewed).toBe(false);
      expect((await db.personDocument.findByPk(passportDoc.id)).reviewed).toBe(false);
    });
  });
});
