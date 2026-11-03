import { Router } from "express";
import tpr from "../controllers/tripPeopleRole.controller.js";
import authenticate from "../authorization/accessControl.js";

const router = Router();

router.get("/", [authenticate], tpr.findAll);
router.get("/:id", [authenticate], tpr.findOne);
router.get("/:id/document-review", [authenticate], tpr.documentReview);
router.get("/:id/documents/:documentId/view", [authenticate], tpr.viewDocument);
router.get(
  "/:id/documents/:documentId/specializations/:specializationId/view",
  [authenticate],
  tpr.viewSpecialization
);
router.put("/:id/documents/:documentId/reviewed", [authenticate], tpr.setDocumentReviewed);
router.post("/", [authenticate], tpr.create);
router.post("/:id/cancel", [authenticate], tpr.cancel);
router.post("/:id/uncancel", [authenticate], tpr.uncancel);
router.put("/:id", [authenticate], tpr.update);
router.delete("/:id", [authenticate], tpr.delete);

export default router;
