import { Router } from "express";
import people from "../controllers/person.controller.js";
import personDocuments from "../controllers/personDocument.controller.js";
import authenticate, { requireSystemAdmin } from "../authorization/accessControl.js";
import { nameDocumentFiles, uploadPersonDocument, uploadPersonPicture } from "../config/multer.js";
import {
  convertHeicUpload,
  convertUploadedPicture,
  HEIC_DOCUMENT_UNREADABLE,
} from "../utils/heicToJpeg.js";

const router = Router();

const handlePictureUpload = (req, res, next) => {
  uploadPersonPicture.single("picture")(req, res, (err) => {
    if (!err) return convertUploadedPicture(req, res, next);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).send({ message: "Image must be 2MB or smaller." });
    }
    return res.status(400).send({ message: err.message || "Invalid image file." });
  });
};

const handleDocumentUpload = (req, res, next) => {
  uploadPersonDocument.fields([
    { name: "document", maxCount: 1 },
    { name: "specializationFiles", maxCount: 30 },
  ])(req, res, async (err) => {
    if (!err) {
      nameDocumentFiles(req);
      for (const group of Object.values(req.files || {})) {
        for (const file of group) {
          if (!(await convertHeicUpload(file))) {
            return res.status(400).send({ message: HEIC_DOCUMENT_UNREADABLE });
          }
        }
      }
      return next();
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).send({ message: "Document must be 10MB or smaller." });
    }
    return res.status(400).send({ message: err.message || "Invalid document file." });
  });
};

router.get("/", [authenticate], people.findAll);
router.get("/org-trip-leaders", [authenticate], people.findOrgTripLeaders);
router.get("/:id", [authenticate], people.findOne);
router.get("/:id/documents", [authenticate], personDocuments.findAll);
router.get("/:id/documents/:documentId/specializations/:specializationId/view", [authenticate], personDocuments.viewSpecialization);
router.get("/:id/documents/:documentId/specializations/:specializationId/download", [authenticate], personDocuments.downloadSpecialization);
router.get("/:id/documents/:documentId/view", [authenticate], personDocuments.view);
router.get("/:id/documents/:documentId/download", [authenticate], personDocuments.download);
router.post("/", [authenticate], people.create);
router.post("/:id/documents", [authenticate], handleDocumentUpload, personDocuments.create);
router.put("/:id", [authenticate], people.update);
router.put("/:id/picture", [authenticate], handlePictureUpload, people.uploadPicture);
router.put("/:id/documents/:documentId", [authenticate], handleDocumentUpload, personDocuments.update);
router.delete("/:id/documents/:documentId", [authenticate], personDocuments.delete);
router.delete("/:id", [authenticate, requireSystemAdmin], people.delete);

export default router;
