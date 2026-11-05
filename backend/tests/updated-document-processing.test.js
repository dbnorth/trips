/**
 * Feature 120 — Updated Document Processing
 * Spec: features/feature-120-updated-document-processing.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { seedEmailTemplates } from "../app/scripts/seedEmailTemplates.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  assignOrgRole,
  completePersonProfile,
  createDocumentType,
  TINY_PNG,
} from "./helpers.js";

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("Feature 120 — Updated Document Processing", () => {
  let admin;
  let org;
  let lena;
  let pat;
  let trip;
  let assignmentId;
  let rnLicense;
  let passport;
  let backgroundCheck;
  let passportDoc;

  /**
   * Lena is a Trip Leader of "Guatemala Clinic" in Hope Missions. Pat applied as Nurse (RN License
   * required) and the trip requires a Passport. Pat has a Passport issued 03/14/2019, expiring 03/13/2029.
   */
  const setup = async ({
    startDate = "2027-01-10",
    endDate = "2027-01-20",
    passportReviewed = false,
    withBackgroundCheck = false,
    orgName = "Hope Missions",
  } = {}) => {
    admin = await createOrgAdminUser({ email: "hope-admin@example.org", orgName });
    org = admin.org;
    lena = await registerUser({ email: "lena@example.org", firstName: "Lena", lastName: "Ruiz", orgIds: [org.id] });
    await assignOrgRole(org.id, lena.user.personId, "Trip Leader");
    rnLicense = await createDocumentType({
      orgId: org.id,
      type: "medical_license",
      description: "RN License",
      hasExpirationDate: true,
    });
    passport = await createDocumentType({
      orgId: org.id,
      type: "passport",
      description: "Passport",
      documentNumberRequired: true,
      hasExpirationDate: true,
    });
    backgroundCheck = await createDocumentType({
      orgId: org.id,
      type: "certification",
      description: "Background check",
      hasExpirationDate: false,
    });
    const tripRes = await request(app)
      .post("/trips/trips")
      .set(admin.authHeader)
      .send({
        orgId: org.id,
        name: "Guatemala Clinic",
        status: "active",
        startDate,
        endDate,
        participantCost: 1800,
        requirePassport: true,
        leaderPeopleIds: [lena.user.personId],
      });
    expect(tripRes.status).toBe(200);
    trip = tripRes.body;
    const nurse = await request(app)
      .post("/trips/worker-roles")
      .set(admin.authHeader)
      .send({
        orgId: org.id,
        name: "Nurse",
        requiredDocumentTypeIds: withBackgroundCheck ? [rnLicense.id, backgroundCheck.id] : [rnLicense.id],
      });
    expect(nurse.status).toBe(200);
    const twr = await request(app)
      .post("/trips/trip-worker-roles")
      .set(admin.authHeader)
      .send({ tripId: trip.id, workerRoleId: nurse.body.id, quantity: 2 });
    expect(twr.status).toBe(200);
    pat = await registerUser({ email: "pat@example.org", firstName: "Pat", lastName: "Lee", orgIds: [org.id] });
    await completePersonProfile(pat.user.personId);
    const applied = await request(app)
      .post(`/trips/trips/browse/${trip.id}/apply`)
      .set(pat.authHeader)
      .send({
        tripWorkerRoleId: twr.body.id,
        willSelfFund: true,
        flightPurchaseOption: "self",
        willRaiseFunds: false,
        hasPreferredRoommate: false,
        isPregnant: false,
        agreementAccepted: true,
        agreementSignatureName: "Pat Lee",
      });
    expect(applied.status).toBe(200);
    assignmentId = applied.body.assignment.id;
    passportDoc = await addDocument(passport, {
      documentNumber: "P123",
      issueDate: "2019-03-14",
      expirationDate: "2029-03-13",
      documentFileName: "people/passport.pdf",
      reviewed: passportReviewed,
    });
  };

  const addDocument = (documentType, fields = {}) =>
    db.personDocument.create({
      personId: pat.user.personId,
      documentTypeId: documentType.id,
      countryIssued: "US",
      documentFileName: `people/${documentType.description}.png`,
      ...fields,
    });

  const staffEdit = (user, documentId, fields = {}, attach = false) => {
    const req = request(app)
      .put(`/trips/trip-people-roles/${assignmentId}/documents/${documentId}`)
      .set(user.authHeader)
      .field("documentTypeId", String(passport.id))
      .field("countryIssued", "US")
      .field("documentNumber", fields.documentNumber ?? "P123")
      .field("issueDate", fields.issueDate ?? "2019-03-14")
      .field("expirationDate", fields.expirationDate ?? "2029-03-13");
    return attach ? req.attach("document", TINY_PNG, { filename: "new.png", contentType: "image/png" }) : req;
  };

  const requestReload = (user, documentId, note) =>
    request(app)
      .post(`/trips/trip-people-roles/${assignmentId}/documents/${documentId}/reload-request`)
      .set(user.authHeader)
      .send(note === undefined ? {} : { note });

  const review = () =>
    request(app).get(`/trips/trip-people-roles/${assignmentId}/document-review`).set(lena.authHeader);

  const profileUpdate = (user, documentId, attach = false) => {
    const req = request(app)
      .put(`/trips/people/${pat.user.personId}/documents/${documentId}`)
      .set(user.authHeader)
      .field("documentTypeId", String(passport.id))
      .field("countryIssued", "US")
      .field("documentNumber", "P123")
      .field("issueDate", "2019-03-14")
      .field("expirationDate", "2029-03-13");
    return attach ? req.attach("document", TINY_PNG, { filename: "renewed.png", contentType: "image/png" }) : req;
  };

  const addReloadTemplate = async () => {
    await seedEmailTypes();
    await seedEmailTokens();
    const emailType = await db.emailType.findOne({ where: { typeCode: "document-reload" } });
    await db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: emailType.id,
      functionCode: "Send Now",
      fromEmail: "office@example.org",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      subject: "Please reload your {{RELOAD_DOCUMENT}}",
      emailBody: "{{RELOAD_NOTE}}",
    });
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-120.1 — Fix a document while looking at it", () => {
    it("Staff edit a document under the viewer", async () => {
      await setup();
      await passportDoc.update({ reloadRequestedAt: new Date() });

      const saved = await staffEdit(lena, passportDoc.id, { expirationDate: "2029-03-12" });

      expect(saved.status).toBe(200);
      expect(saved.body).toMatchObject({ id: passportDoc.id, expirationDate: "2029-03-12", reviewed: false });
      await passportDoc.reload();
      expect(passportDoc.expirationDate).toBe("2029-03-12");
      expect(passportDoc.reloadRequestedAt).not.toBeNull();

      const replaced = await staffEdit(lena, passportDoc.id, {}, true);
      expect(replaced.status).toBe(200);
      await passportDoc.reload();
      expect(passportDoc.documentFileName).toMatch(new RegExp(`^people/person-${pat.user.personId}-`));
      expect(passportDoc.reloadRequestedAt).toBeNull();

      const other = await registerUser({ email: "kim@example.org", firstName: "Kim", lastName: "Ito", orgIds: [org.id] });
      const otherDoc = await db.personDocument.create({ personId: other.user.personId, documentTypeId: passport.id });
      const missing = await staffEdit(lena, otherDoc.id);
      expect(missing.status).toBe(404);
      expect(missing.body.message).toBe("Document not found.");

      const types = (await review()).body.documentTypes.map((t) => t.description);
      expect(types).toEqual(["Background check", "Passport", "RN License"]);
    });

    it("Reviewed documents can't be edited until unticked", async () => {
      await setup({ passportReviewed: true });

      const refused = await staffEdit(lena, passportDoc.id, { documentNumber: "P999" });

      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe("Untick Reviewed to edit this document.");
      expect((await db.personDocument.findByPk(passportDoc.id)).documentNumber).toBe("P123");

      await request(app)
        .put(`/trips/trip-people-roles/${assignmentId}/documents/${passportDoc.id}/reviewed`)
        .set(lena.authHeader)
        .send({ reviewed: false });
      expect((await staffEdit(lena, passportDoc.id, { documentNumber: "P999" })).status).toBe(200);
    });
  });

  describe("US-120.2 — Ask for a new file", () => {
    it("Request reload sends the email and marks the document", async () => {
      await setup({ passportReviewed: true });
      await addReloadTemplate();

      const res = await requestReload(lena, passportDoc.id, "  The photo page is blurry.  ");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: passportDoc.id, reviewed: false, emailSent: true, templateFound: true });
      expect(res.body.reloadRequestedAt).toBeTruthy();
      const [log] = await db.emailLog.findAll({ where: { emailTemplateId: { [db.Sequelize.Op.ne]: null } } });
      expect(log.subject).toBe("Please reload your Passport, issued 03/14/2019, expires 03/13/2029");
      expect(log.content).toContain("The photo page is blurry.");
      expect(log.content).not.toContain("P123");
      expect(log.toEmail).toBe("pat@example.org");
      expect(Number(log.personId)).toBe(Number(pat.user.personId));
      expect(Number(log.tripId)).toBe(Number(trip.id));

      const listed = (await review()).body.requirements.find((r) => r.key === "passport").documents[0];
      expect(listed.reviewed).toBe(false);
      expect(listed.reloadRequestedAt).toBeTruthy();
      const profile = await request(app).get(`/trips/people/${pat.user.personId}/documents`).set(pat.authHeader);
      expect(profile.body.find((d) => d.id === passportDoc.id).reloadRequestedAt).toBeTruthy();

      expect((await profileUpdate(pat, passportDoc.id, true)).status).toBe(200);
      expect((await db.personDocument.findByPk(passportDoc.id)).reloadRequestedAt).toBeNull();

      const tooLong = await requestReload(lena, passportDoc.id, "x".repeat(1001));
      expect(tooLong.status).toBe(400);
      expect(tooLong.body.message).toBe("Note must be 1000 characters or less.");
    });

    it("The seed adds a reload request template", async () => {
      await setup({ orgName: "Health Talents International" });
      await db.organization.update({ email: "info@example.org" }, { where: { id: org.id } });
      await seedEmailTypes();
      await seedEmailTokens();
      await seedEmailTemplates();
      const type = await db.emailType.findOne({ where: { typeCode: "document-reload" } });
      const template = await db.emailTemplate.findOne({ where: { orgId: org.id, emailTypeId: type.id } });
      expect([template.functionCode, template.tripId]).toEqual(["Send Now", null]);

      const res = await requestReload(lena, passportDoc.id, "The photo page is blurry.");

      expect(res.body).toMatchObject({ emailSent: true, templateFound: true });
      const [log] = await db.emailLog.findAll({ where: { emailTemplateId: template.id } });
      expect(log.subject).toBe("Please reupload your Passport");
      expect(log.content).toContain(
        "Trip staff for Guatemala Clinic asked you to reupload this document:\n\nPassport, issued 03/14/2019, expires 03/13/2029"
      );
      expect(log.content).toContain("The photo page is blurry.");
      expect(log.toEmail).toBe("pat@example.org");
    });

    it("Reload request without a template", async () => {
      await setup({ passportReviewed: true });

      const res = await requestReload(lena, passportDoc.id);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ reviewed: false, emailSent: false, templateFound: false });
      await passportDoc.reload();
      expect(passportDoc.reviewed).toBe(false);
      expect(passportDoc.reloadRequestedAt).not.toBeNull();
    });

    it("Only trip staff can edit or request reloads", async () => {
      await setup();

      for (const res of [await staffEdit(pat, passportDoc.id), await requestReload(pat, passportDoc.id)]) {
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden.");
      }
      expect((await db.personDocument.findByPk(passportDoc.id)).reloadRequestedAt).toBeNull();
    });

    it("Marking a document Reviewed clears its reload request", async () => {
      await setup();
      await passportDoc.update({ reloadRequestedAt: new Date() });
      const setReviewed = (reviewed) =>
        request(app)
          .put(`/trips/trip-people-roles/${assignmentId}/documents/${passportDoc.id}/reviewed`)
          .set(lena.authHeader)
          .send({ reviewed });

      const ticked = await setReviewed(true);

      expect(ticked.status).toBe(200);
      expect(ticked.body).toMatchObject({ reviewed: true, reloadRequestedAt: null });
      await passportDoc.reload();
      expect(passportDoc.reloadRequestedAt).toBeNull();
    });
  });

  describe("US-120.3 — Reviewed documents stay as reviewed", () => {
    it("Reviewed documents are locked everywhere", async () => {
      await setup({ passportReviewed: true });
      const sysAdmin = await createSystemAdminUser();

      for (const user of [pat, sysAdmin]) {
        const put = await profileUpdate(user, passportDoc.id, true);
        expect(put.status).toBe(400);
        expect(put.body.message).toBe("Reviewed documents can't be changed.");
        const del = await request(app)
          .delete(`/trips/people/${pat.user.personId}/documents/${passportDoc.id}`)
          .set(user.authHeader);
        expect(del.status).toBe(400);
        expect(del.body.message).toBe("Reviewed documents can't be changed.");
      }
      await passportDoc.reload();
      expect(passportDoc.documentFileName).toBe("people/passport.pdf");
      expect(passportDoc.reviewed).toBe(true);
    });

    it("Another document of the same type can be added", async () => {
      await setup({ passportReviewed: true });

      const added = await request(app)
        .post(`/trips/people/${pat.user.personId}/documents`)
        .set(pat.authHeader)
        .field("documentTypeId", String(passport.id))
        .field("countryIssued", "US")
        .field("documentNumber", "P456")
        .field("issueDate", "2026-02-01")
        .field("expirationDate", "2036-01-31")
        .attach("document", TINY_PNG, { filename: "passport.png", contentType: "image/png" });

      expect(added.status).toBe(200);
      const list = await request(app).get(`/trips/people/${pat.user.personId}/documents`).set(pat.authHeader);
      expect(list.body.filter((d) => d.documentTypeId === passport.id)).toHaveLength(2);
    });

    it("The trip page shows when every trip document is reviewed", async () => {
      await setup({ passportReviewed: true });
      const status = async () => {
        const res = await request(app).get(`/trips/trips/${trip.id}/status`).set(lena.authHeader);
        expect(res.status).toBe(200);
        const { documentsReviewed, documentsToReview } = res.body.participants.find(
          (p) => p.id === assignmentId
        );
        return { documentsReviewed, documentsToReview };
      };

      expect(await status()).toEqual({ documentsReviewed: false, documentsToReview: false });
      const rn = await addDocument(rnLicense, { issueDate: "2024-01-01", expirationDate: "2030-01-01" });
      expect(await status()).toEqual({ documentsReviewed: false, documentsToReview: true });
      await rn.update({ reviewed: true });
      expect(await status()).toEqual({ documentsReviewed: true, documentsToReview: false });
    });
  });

  describe("US-120.4 — The newest document counts", () => {
    it("The document expiring last is used for the trip", async () => {
      await setup({ passportReviewed: true });
      await addDocument(rnLicense, { expirationDate: "2030-01-01", reviewed: true });
      const renewed = await addDocument(passport, {
        documentNumber: "P456",
        issueDate: "2026-02-01",
        expirationDate: "2036-01-31",
      });

      const before = (await review()).body;
      const passports = before.requirements.find((r) => r.key === "passport").documents;
      expect(passports.map((d) => [d.id, d.current])).toEqual([
        [renewed.id, true],
        [passportDoc.id, false],
      ]);
      expect(before.approvalBlockers).toEqual(["Passport: not reviewed"]);

      await request(app)
        .put(`/trips/trip-people-roles/${assignmentId}/documents/${renewed.id}/reviewed`)
        .set(lena.authHeader)
        .send({ reviewed: true });
      expect((await review()).body.approvalBlockers).toEqual([]);
    });

    it("An expired newer document doesn't fall back to an older one", async () => {
      await setup({ startDate: dateFromToday(60), endDate: dateFromToday(70) });
      const expiring = await addDocument(rnLicense, { issueDate: "2025-01-01", expirationDate: dateFromToday(65) });
      await addDocument(rnLicense, { issueDate: "2020-01-01", expirationDate: null });

      const licenses = (await review()).body.requirements.find((r) => r.label === "RN License").documents;
      expect(licenses[0]).toMatchObject({ id: expiring.id, current: true });

      const mine = await request(app).get("/trips/trips/browse/mine").query({ orgId: org.id }).set(pat.authHeader);
      const [action] = mine.body.find((t) => Number(t.id) === Number(trip.id)).nextActions;
      expect(action.code).toBe("upload-documents");
      expect(action.missingDocuments[0]).toMatch(/^RN License: the expiration date/);
    });

    it("Without expiration dates the latest issue date is used", async () => {
      await setup({ withBackgroundCheck: true });
      await addDocument(backgroundCheck, { issueDate: "2024-05-01" });
      const latest = await addDocument(backgroundCheck, { issueDate: "2026-05-01" });

      const checks = (await review()).body.requirements.find((r) => r.label === "Background check").documents;

      expect(checks.map((d) => [d.id, d.current])[0]).toEqual([latest.id, true]);
      expect(checks[1].current).toBe(false);
    });
  });
});
