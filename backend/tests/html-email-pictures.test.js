/**
 * Feature 77 — HTML Emails, Rich Text Editor, and Picture Library
 * Spec: features/feature-77-html-email-pictures.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { emailTransport } from "../app/utils/emailDelivery.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
  TINY_PNG,
} from "./helpers.js";

const PICTURE_DIR = path.resolve("images", "email-pictures");
const EMAIL_KEYS = ["EMAIL_MODE", "EMAIL_FILE_DIR", "SMTP_USER", "SMTP_PASSWORD_SECRET_ID"];
const PDF = Buffer.from("%PDF-1.4 notes");

const pictureFiles = () => (fs.existsSync(PICTURE_DIR) ? fs.readdirSync(PICTURE_DIR) : []);

describe("Feature 77 — HTML Emails, Rich Text Editor, and Picture Library", () => {
  let savedEnv;
  let mailRoot;
  let filesBefore;
  let originalCreate;
  let smtpMessages;
  let omar;
  let org;
  let trip;
  let tess;
  let olga;
  let ana;
  let clinic;
  let emailType;

  const upload = (auth, orgId, { content = TINY_PNG, filename = "clinic.jpg", contentType = "image/jpeg" } = {}) =>
    request(app)
      .post("/trips/email-pictures")
      .set(auth)
      .field("orgId", String(orgId))
      .attach("file", content, { filename, contentType });

  const pictureTag = (picture) => `<img data-picture-id="${picture.id}" alt="${picture.name}" />`;

  const addTemplate = (emailBody, fields = {}) =>
    db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: emailType.id,
      functionCode: "Trip Participant",
      fromEmail: "{{ORG_EMAIL}}",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      subject: "Team update",
      emailBody,
      ...fields,
    });

  const sendToAna = (template, emailBody = template.emailBody) =>
    request(app).post(`/trips/trips/${trip.id}/team-email`).set(tess.authHeader).send({
      emailTemplateId: template.id,
      subject: template.subject,
      emailBody,
      sendTo: "selected",
      personIds: [ana.id],
    });

  const templateBody = (emailBody) => ({
    orgId: org.id,
    emailTypeId: emailType.id,
    functionCode: "Trip Participant",
    subject: "Welcome",
    fromEmail: "{{ORG_EMAIL}}",
    toAddress: "{{PARTICIPANT_EMAIL}}",
    emailBody,
  });

  const useSmtp = () => {
    process.env.EMAIL_MODE = "smtp";
    emailTransport.create = () => ({
      sendMail: async (message) => {
        smtpMessages.push(message);
        return { messageId: `id-${smtpMessages.length}` };
      },
    });
  };

  beforeAll(async () => {
    await syncTestDatabase();
    originalCreate = emailTransport.create;
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(EMAIL_KEYS.map((key) => [key, process.env[key]]));
    for (const key of EMAIL_KEYS) delete process.env[key];
    mailRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trips-pictures-"));
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = path.join(mailRoot, "mail");
    smtpMessages = [];
    filesBefore = new Set(pictureFiles());

    omar = await createOrgAdminUser({ email: "omar@example.org", orgName: "Hope Missions" });
    org = omar.org;
    await org.update({ email: "office@hope.org" });
    trip = await db.trip.create({ orgId: org.id, name: "Guatemala Clinic", status: "active" });
    tess = await registerUser({ email: "tess@example.org", firstName: "Tess", orgIds: [org.id] });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: tess.user.personId,
      roleId: (await findRole("Trip Leader")).id,
      status: "approved",
    });
    ana = await db.person.create({ firstName: "Ana", lastName: "Lopez", email: "ana@example.org" });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ana.id,
      roleId: (await findRole("Trip Participant")).id,
      status: "approved",
    });
    olga = await createOrgAdminUser({ email: "olga@example.org", orgName: "Other Org" });
    for (const [tokenCode, valueSource] of [
      ["ORG_EMAIL", "organization.email"],
      ["PARTICIPANT_EMAIL", "participant.email"],
      ["PARTICIPANT_FIRST_NAME", "participant.firstName"],
    ]) {
      await db.emailToken.create({ tokenCode, description: tokenCode, valueSource });
    }
    emailType = await db.emailType.create({
      typeCode: "team-update",
      description: "Trip team update",
      eventCode: "team-email",
    });
    clinic = (await upload(omar.authHeader, org.id, { filename: "clinic.jpg" }).field("name", "Clinic team")).body;
  });

  afterEach(async () => {
    emailTransport.create = originalCreate;
    for (const key of EMAIL_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    fs.rmSync(mailRoot, { recursive: true, force: true });
    for (const name of pictureFiles()) {
      if (!filesBefore.has(name)) fs.rmSync(path.join(PICTURE_DIR, name), { force: true });
    }
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-77.1 — Organizations keep a picture library", () => {
    it("Org Admin uploads a picture", async () => {
      const created = await upload(omar.authHeader, org.id, { filename: "school.png", contentType: "image/png" });

      expect(created.status).toBe(200);
      const list = await request(app).get(`/trips/email-pictures?orgId=${org.id}`).set(omar.authHeader);
      const school = list.body.find((picture) => picture.name === "school");
      expect(school).toMatchObject({ contentType: "image/png", sizeBytes: TINY_PNG.length });
      expect(school.url).toMatch(/^images\/email-pictures\/org-\d+-[0-9a-f]{32}\.png$/);
      expect(fs.readFileSync(path.join("images", school.url.replace(/^images\//, "")))).toEqual(TINY_PNG);
    });

    it("Only PNG, JPEG, or GIF up to 2 MB can be uploaded", async () => {
      const pdf = await upload(omar.authHeader, org.id, {
        content: PDF,
        filename: "notes.pdf",
        contentType: "application/pdf",
      });
      expect(pdf.status).toBe(400);
      expect(pdf.body.message).toBe("Upload a PNG, JPEG, or GIF picture.");

      const large = await upload(omar.authHeader, org.id, { content: Buffer.alloc(3 * 1024 * 1024) });
      expect(large.status).toBe(400);
      expect(large.body.message).toBe("The picture must be 2 MB or smaller.");
    });

    it("Who can upload, rename, and delete pictures", async () => {
      expect((await upload(tess.authHeader, org.id)).status).toBe(200);
      const tessRename = await request(app)
        .put(`/trips/email-pictures/${clinic.id}`)
        .set(tess.authHeader)
        .send({ name: "Mine" });
      expect(tessRename.status).toBe(403);
      expect(
        (await request(app).delete(`/trips/email-pictures/${clinic.id}`).set(tess.authHeader)).status
      ).toBe(403);
      expect(
        (await request(app).get(`/trips/email-pictures?orgId=${org.id}`).set(olga.authHeader)).status
      ).toBe(403);
      expect((await upload(olga.authHeader, org.id)).status).toBe(403);

      const rename = await request(app)
        .put(`/trips/email-pictures/${clinic.id}`)
        .set(omar.authHeader)
        .send({ name: "Clinic staff" });
      expect(rename.status).toBe(200);
      expect(rename.body.name).toBe("Clinic staff");
    });

    it("A picture used by a template cannot be deleted", async () => {
      await addTemplate(`<p>${pictureTag(clinic)}</p>`);

      const remove = await request(app).delete(`/trips/email-pictures/${clinic.id}`).set(omar.authHeader);

      expect(remove.status).toBe(400);
      expect(remove.body.message).toBe("This picture is used by 1 templates.");
      expect(await db.emailPicture.findByPk(clinic.id)).not.toBeNull();
    });
  });

  describe("US-77.2 — Write email bodies with formatting and pictures", () => {
    it("Template body keeps formatting, links, and library pictures", async () => {
      const body =
        "<p><strong>Welcome</strong> {{PARTICIPANT_FIRST_NAME}}</p>" +
        '<p><a href="https://hope.org" target="_blank" rel="noopener">Hope</a></p>' +
        `<p><img src="http://localhost:3200/trips/${clinic.url}" alt="Clinic team" data-picture-id="${clinic.id}"></p>`;

      const create = await request(app).post("/trips/email-templates").set(omar.authHeader).send(templateBody(body));

      expect(create.status).toBe(200);
      const saved = await request(app).get(`/trips/email-templates/${create.body.id}`).set(omar.authHeader);
      expect(saved.body.emailBody).toBe(
        "<p><strong>Welcome</strong> {{PARTICIPANT_FIRST_NAME}}</p>" +
          '<p><a href="https://hope.org">Hope</a></p>' +
          `<p><img alt="Clinic team" data-picture-id="${clinic.id}" /></p>`
      );
    });

    it("Unsafe HTML is removed on save", async () => {
      const create = await request(app)
        .post("/trips/email-templates")
        .set(omar.authHeader)
        .send(templateBody('<script>alert(1)</script><p onclick="x()">Hi</p>'));

      expect(create.status).toBe(200);
      expect((await db.emailTemplate.findByPk(create.body.id)).emailBody).toBe("<p>Hi</p>");
    });

    it("Pictures must come from the organization's library", async () => {
      const foreign = (await upload(olga.authHeader, olga.org.id)).body;

      const create = await request(app)
        .post("/trips/email-templates")
        .set(omar.authHeader)
        .send(templateBody(`<p>${pictureTag(foreign)}</p>`));

      expect(create.status).toBe(400);
      expect(create.body.message).toBe("Pictures must come from this organization's library.");
    });

    it("Resized pictures keep their width", async () => {
      const saveWithWidth = async (width) => {
        const create = await request(app)
          .post("/trips/email-templates")
          .set(omar.authHeader)
          .send(templateBody(`<p><img alt="Clinic team" data-picture-id="${clinic.id}" width="${width}"></p>`));
        expect(create.status).toBe(200);
        return db.emailTemplate.findByPk(create.body.id);
      };

      const resized = await saveWithWidth("300");
      expect(resized.emailBody).toBe(`<p><img alt="Clinic team" data-picture-id="${clinic.id}" width="300" /></p>`);
      expect((await saveWithWidth("9999")).emailBody).toContain('width="600"');
      expect((await saveWithWidth("big")).emailBody).toBe(
        `<p><img alt="Clinic team" data-picture-id="${clinic.id}" /></p>`
      );

      useSmtp();
      const send = await sendToAna(resized);

      expect(send.body).toMatchObject({ sent: 1 });
      expect(smtpMessages[0].html).toContain(
        `<img src="cid:picture-${clinic.id}@missiontrips.app" alt="Clinic team" width="300" style="width:300px;max-width:100%;height:auto">`
      );
    });

    it("Centered paragraphs are kept", async () => {
      const create = await request(app)
        .post("/trips/email-templates")
        .set(omar.authHeader)
        .send(
          templateBody(
            '<p style="text-align: center">Welcome</p>' +
              `<p style="text-align: center">${pictureTag(clinic)}</p>` +
              '<p style="text-align: right; color: red">Bye</p>'
          )
        );

      expect(create.status).toBe(200);
      const saved = await db.emailTemplate.findByPk(create.body.id);
      expect(saved.emailBody).toBe(
        '<p style="text-align:center">Welcome</p>' +
          `<p style="text-align:center">${pictureTag(clinic)}</p>` +
          "<p>Bye</p>"
      );

      useSmtp();
      const send = await sendToAna(saved);

      expect(send.body).toMatchObject({ sent: 1 });
      expect(smtpMessages[0].html).toContain('<p style="text-align:center">Welcome</p>');
      expect(smtpMessages[0].html).toContain(
        `<p style="text-align:center"><img src="cid:picture-${clinic.id}@missiontrips.app"`
      );
    });
  });

  describe("US-77.3 — Emails are sent as HTML with embedded pictures", () => {
    it("Email team sends HTML with the picture embedded", async () => {
      const template = await addTemplate(
        `<p><strong>Hi {{PARTICIPANT_FIRST_NAME}}</strong></p><p>${pictureTag(clinic)}</p><p>${pictureTag(clinic)}</p>`
      );
      useSmtp();

      const send = await sendToAna(template);

      expect(send.body).toMatchObject({ sent: 1, skipped: 0, failed: 0 });
      const [message] = smtpMessages;
      const cid = `picture-${clinic.id}@missiontrips.app`;
      expect(message.html).toContain("<strong>Hi Ana</strong>");
      expect(message.html.split(`src="cid:${cid}"`)).toHaveLength(3);
      expect(message.attachments).toEqual([
        {
          filename: "Clinic team.jpg",
          content: TINY_PNG,
          contentType: "image/jpeg",
          cid,
          contentDisposition: "inline",
        },
      ]);
      expect(message.text).toContain("Hi Ana");
      expect(message.text).toContain("[Picture: Clinic team]");
    });

    it("Token values are escaped in HTML", async () => {
      await ana.update({ firstName: "<b>Ana</b>" });
      const template = await addTemplate("<p>Hi {{PARTICIPANT_FIRST_NAME}}</p>");
      useSmtp();

      await sendToAna(template);

      expect(smtpMessages[0].html).toBe("<p>Hi &lt;b&gt;Ana&lt;/b&gt;</p>");
      expect(smtpMessages[0].text).toBe("Hi <b>Ana</b>");
    });

    it("Old plain-text bodies still send", async () => {
      const template = await addTemplate("Hello\nSee you soon");
      useSmtp();

      await sendToAna(template);

      expect(smtpMessages[0].text).toBe("Hello\nSee you soon");
      expect(smtpMessages[0].html).toBe("Hello<br>See you soon");
    });

    it("A missing picture skips the email", async () => {
      const template = await addTemplate(`<p>${pictureTag(clinic)}</p>`);
      fs.rmSync(path.join("images", clinic.url.replace(/^images\//, "")));

      const send = await sendToAna(template);

      expect(send.body).toMatchObject({ sent: 0, skipped: 1, failed: 0 });
      expect(send.body.results[0].reason).toBe("Picture Clinic team is missing.");
    });

    it("File mode writes the HTML beside the text", async () => {
      const template = await addTemplate(`<p>Hi</p><p>${pictureTag(clinic)}</p>`);

      await sendToAna(template);

      const dir = process.env.EMAIL_FILE_DIR;
      const txtName = fs.readdirSync(dir).find((name) => name.endsWith(".txt"));
      const lines = fs.readFileSync(path.join(dir, txtName), "utf8").split("\n");
      const subjectAt = lines.findIndex((line) => line.startsWith("Subject: "));
      expect(lines[subjectAt + 1]).toBe("Pictures: Clinic team");
      const html = fs.readFileSync(path.join(dir, txtName.replace(/\.txt$/, ".html")), "utf8");
      expect(html).toContain(`src="data:image/jpeg;base64,${TINY_PNG.toString("base64")}"`);
    });
  });

  describe("US-77.4 — Manual sends use the editor too", () => {
    it("Email team sends an edited body with a picture", async () => {
      const template = await addTemplate("Team update");
      useSmtp();

      const send = await sendToAna(template, `<p>Team update</p><p>${pictureTag(clinic)}</p>`);

      expect(send.body.sent).toBe(1);
      expect(smtpMessages[0].html).toContain(`src="cid:picture-${clinic.id}@missiontrips.app"`);
      expect((await db.emailTemplate.findByPk(template.id)).emailBody).toBe("Team update");
    });
  });
});
