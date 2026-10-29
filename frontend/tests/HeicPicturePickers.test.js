/**
 * Feature 96 — Convert HEIC Uploads to JPEG
 * Spec: features/feature-96-heic-to-jpeg-on-upload.md
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PICKERS = [
  "components/EditPersonDialog.vue",
  "components/AddOrganizationDialog.vue",
  "components/EditOrganizationDialog.vue",
  "components/AddTripDialog.vue",
  "components/EditTripDialog.vue",
  "views/EmailPicturesList.vue",
  "components/RichTextEditor.vue",
];

const acceptLists = (file) =>
  [...fs.readFileSync(path.resolve("src", file), "utf8").matchAll(/accept="(image\/[^"]*)"/g)].map(
    (match) => match[1].split(",")
  );

describe("Feature 96 — Convert HEIC Uploads to JPEG", () => {
  describe("US-96.2 — HEIC photos can be used as pictures", () => {
    it("Picture file pickers offer HEIC files", () => {
      for (const file of PICKERS) {
        const lists = acceptLists(file);
        expect(lists.length, file).toBeGreaterThan(0);
        for (const accept of lists) {
          expect(accept, file).toEqual(
            expect.arrayContaining(["image/heic", "image/heif", ".heic", ".heif"])
          );
        }
      }
    });
  });
});
