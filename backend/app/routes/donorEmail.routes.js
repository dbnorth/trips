import { Router } from "express";
import donorEmail from "../controllers/donorEmail.controller.js";
import { authenticate } from "../authorization/accessControl.js";

const router = Router();

router.get("/options", [authenticate], donorEmail.options);
router.post("/recipients", [authenticate], donorEmail.recipients);
router.post("/preview", [authenticate], donorEmail.preview);
router.post("/send", [authenticate], donorEmail.send);

export default router;
