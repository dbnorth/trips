import { Router } from "express";
import medicalConditions from "../controllers/medicalCondition.controller.js";
import authenticate from "../authorization/accessControl.js";

const router = Router();

router.get("/", [authenticate], medicalConditions.findAll);
router.get("/:id", [authenticate], medicalConditions.findOne);
router.post("/", [authenticate], medicalConditions.create);
router.put("/:id", [authenticate], medicalConditions.update);
router.delete("/:id", [authenticate], medicalConditions.delete);

export default router;
