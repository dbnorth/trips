/**
 * Feature 65 — Replacing a Picture, Logo, or Trip Image Keeps the New File
 * Spec: features/feature-65-fix-image-replace.md
 */

import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrganization,
  createOrgAdminUser,
  createSystemAdminUser,
  TINY_PNG,
} from "./helpers.js";

// Fixed ids far above local data, so the old-style files planted here never clash with real images.
const PERSON_ID = 900001;
const ORG_ID = 900002;
const TRIP_ID = 900003;

const imageFile = (stored) => path.join("images", stored);

const createdFiles = [];

/** Write an image under images/ the way pre-Feature 65 uploads named it. */
const plantImage = (stored) => {
  const file = imageFile(stored);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, TINY_PNG);
  createdFiles.push(file);
};

const track = (stored) => {
  createdFiles.push(imageFile(stored));
  return stored;
};

describe("Feature 65 — Replacing a Picture, Logo, or Trip Image Keeps the New File", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    for (const file of createdFiles.splice(0)) fs.rmSync(file, { force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-65.1 — Replace my profile picture", () => {
    it("Replacing a profile picture with the same image type keeps the new picture", async () => {
      const { authHeader } = await createSystemAdminUser();
      const oldPicture = `people/person-${PERSON_ID}.png`;
      plantImage(oldPicture);
      await db.person.create({
        id: PERSON_ID,
        firstName: "Pat",
        lastName: "Picture",
        email: "pat@example.com",
        picture: oldPicture,
      });

      const upload = await request(app)
        .put(`/trips/people/${PERSON_ID}/picture`)
        .set(authHeader)
        .attach("picture", TINY_PNG, { filename: "me.png", contentType: "image/png" });

      expect(upload.status).toBe(200);
      const picture = track(upload.body.picture);
      expect(picture).toMatch(new RegExp(`^people/person-${PERSON_ID}-\\d+\\.png$`));
      expect((await request(app).get(`/trips/images/${picture}`)).status).toBe(200);
      expect(fs.existsSync(imageFile(oldPicture))).toBe(false);
      expect((await db.person.findByPk(PERSON_ID)).picture).toBe(picture);
    });

    it("Replacing a profile picture twice keeps the latest picture", async () => {
      const { authHeader } = await createSystemAdminUser();
      await db.person.create({
        id: PERSON_ID,
        firstName: "Pat",
        lastName: "Picture",
        email: "pat@example.com",
      });

      const upload = () =>
        request(app)
          .put(`/trips/people/${PERSON_ID}/picture`)
          .set(authHeader)
          .attach("picture", TINY_PNG, { filename: "me.png", contentType: "image/png" });

      const first = await upload();
      expect(first.status).toBe(200);
      const firstPicture = track(first.body.picture);

      const second = await upload();
      expect(second.status).toBe(200);
      const secondPicture = track(second.body.picture);

      expect(secondPicture).not.toBe(firstPicture);
      expect((await request(app).get(`/trips/images/${secondPicture}`)).status).toBe(200);
      expect(fs.existsSync(imageFile(firstPicture))).toBe(false);
    });
  });

  describe("US-65.2 — Replace an organization logo", () => {
    it("Replacing an organization logo with the same image type keeps the new logo", async () => {
      const oldLogo = `logos/org-${ORG_ID}.png`;
      plantImage(oldLogo);
      const org = await db.organization.create({ id: ORG_ID, name: "Logo Org", logo: oldLogo });
      const { authHeader } = await createOrgAdminUser({ org });

      const upload = await request(app)
        .put(`/trips/organizations/${ORG_ID}/logo`)
        .set(authHeader)
        .attach("logo", TINY_PNG, { filename: "logo.png", contentType: "image/png" });

      expect(upload.status).toBe(200);
      const logo = track(upload.body.logo);
      expect(logo).toMatch(new RegExp(`^logos/org-${ORG_ID}-\\d+\\.png$`));
      expect((await request(app).get(`/trips/images/${logo}`)).status).toBe(200);
      expect(fs.existsSync(imageFile(oldLogo))).toBe(false);
    });
  });

  describe("US-65.3 — Replace a trip image", () => {
    it("Replacing a trip image with the same image type keeps the new image", async () => {
      const org = await createOrganization("Trip Image Org");
      const { authHeader } = await createOrgAdminUser({ org });
      const oldImage = `trips/trip-${TRIP_ID}.png`;
      plantImage(oldImage);
      await db.trip.create({ id: TRIP_ID, orgId: org.id, name: "Image Trip", status: "active", image: oldImage });

      const upload = await request(app)
        .put(`/trips/trips/${TRIP_ID}/image`)
        .set(authHeader)
        .attach("image", TINY_PNG, { filename: "trip.png", contentType: "image/png" });

      expect(upload.status).toBe(200);
      const image = track(upload.body.image);
      expect(image).toMatch(new RegExp(`^trips/trip-${TRIP_ID}-\\d+\\.png$`));
      expect((await request(app).get(`/trips/images/${image}`)).status).toBe(200);
      expect(fs.existsSync(imageFile(oldImage))).toBe(false);
    });
  });
});
