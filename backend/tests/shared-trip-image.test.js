/**
 * Feature 66 — A Trip Image Shared With a Copied Trip Is Kept
 * Spec: features/feature-66-shared-trip-image-kept.md
 */

import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, createOrgAdminUser, TINY_PNG } from "./helpers.js";

// Fixed id far above local data, so the planted image never clashes with real images.
const SOURCE_TRIP_ID = 900011;
const SOURCE_IMAGE = `trips/trip-${SOURCE_TRIP_ID}.png`;

const imageFile = (stored) => path.join("images", stored);

const createdFiles = [];

const track = (stored) => {
  createdFiles.push(imageFile(stored));
  return stored;
};

/** Org Admin with a trip whose image file exists on disk. */
const createTripWithImage = async () => {
  const { authHeader, org } = await createOrgAdminUser();
  const file = imageFile(SOURCE_IMAGE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, TINY_PNG);
  createdFiles.push(file);
  const source = await db.trip.create({
    id: SOURCE_TRIP_ID,
    orgId: org.id,
    name: "Source Trip",
    status: "active",
    image: SOURCE_IMAGE,
  });
  return { authHeader, source };
};

const copyTrip = async (authHeader, source) => {
  const copy = await request(app)
    .post(`/trips/trips/${source.id}/copy`)
    .set(authHeader)
    .send({ name: "Copied Trip" });
  expect(copy.status).toBe(201);
  expect(copy.body.image).toBe(SOURCE_IMAGE);
  return copy.body;
};

const uploadImage = async (authHeader, tripId) => {
  const upload = await request(app)
    .put(`/trips/trips/${tripId}/image`)
    .set(authHeader)
    .attach("image", TINY_PNG, { filename: "trip.png", contentType: "image/png" });
  expect(upload.status).toBe(200);
  return track(upload.body.image);
};

const deleteTrip = async (authHeader, tripId) => {
  const response = await request(app).delete(`/trips/trips/${tripId}`).set(authHeader);
  expect(response.status).toBe(200);
};

const imageStatus = async (stored) => (await request(app).get(`/trips/images/${stored}`)).status;

describe("Feature 66 — A Trip Image Shared With a Copied Trip Is Kept", () => {
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

  describe("US-66.1 — Change a copied trip's image without breaking the original", () => {
    it("Replacing a copied trip's image keeps the source trip's image", async () => {
      const { authHeader, source } = await createTripWithImage();
      const copy = await copyTrip(authHeader, source);

      await uploadImage(authHeader, copy.id);

      expect(await imageStatus(SOURCE_IMAGE)).toBe(200);
      expect((await db.trip.findByPk(source.id)).image).toBe(SOURCE_IMAGE);
    });

    it("Replacing the source trip's image keeps the copy's image", async () => {
      const { authHeader, source } = await createTripWithImage();
      const copy = await copyTrip(authHeader, source);

      await uploadImage(authHeader, source.id);

      expect((await db.trip.findByPk(copy.id)).image).toBe(SOURCE_IMAGE);
      expect(await imageStatus(SOURCE_IMAGE)).toBe(200);
    });

    it("Replacing an image no other trip uses deletes the old file", async () => {
      const { authHeader, source } = await createTripWithImage();

      await uploadImage(authHeader, source.id);

      expect(fs.existsSync(imageFile(SOURCE_IMAGE))).toBe(false);
    });
  });

  describe("US-66.2 — Delete a copied trip without breaking the original", () => {
    it("Deleting a copied trip keeps the source trip's image", async () => {
      const { authHeader, source } = await createTripWithImage();
      const copy = await copyTrip(authHeader, source);

      await deleteTrip(authHeader, copy.id);

      expect(await imageStatus(SOURCE_IMAGE)).toBe(200);
    });

    it("Deleting the last trip using an image deletes the file", async () => {
      const { authHeader, source } = await createTripWithImage();
      const copy = await copyTrip(authHeader, source);

      await deleteTrip(authHeader, copy.id);
      await deleteTrip(authHeader, source.id);

      expect(fs.existsSync(imageFile(SOURCE_IMAGE))).toBe(false);
    });
  });
});
