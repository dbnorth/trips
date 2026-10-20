/**
 * Feature 63 — Encrypt Person Documents on Disk
 * Spec: features/feature-63-encrypt-person-documents.md
 */

import { describe, it, expect, vi, afterEach } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../src/services/services.js", () => ({
  default: { get },
}));

import PersonDocumentServices from "../src/services/personDocumentServices.js";

describe("Feature 63 — Encrypt Person Documents on Disk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    get.mockReset();
  });

  describe("US-63.2 — Documents still open, download, and print", () => {
    it("Downloaded file is saved with its file extension", async () => {
      get.mockResolvedValue({ data: new Blob(["%PDF"]), headers: {} });
      URL.createObjectURL = vi.fn(() => "blob:download");
      URL.revokeObjectURL = vi.fn();
      const savedAs = [];
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
        savedAs.push(this.download);
      });

      await PersonDocumentServices.download(26, {
        id: 1,
        documentFileName: "people/person-26-1-passport.pdf",
      });

      expect(get).toHaveBeenCalledWith("/people/26/documents/1/download", { responseType: "blob" });
      expect(savedAs).toEqual(["person-26-1-passport.pdf"]);
    });
  });
});
