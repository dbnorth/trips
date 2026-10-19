import { Router } from "express";
import peopleEmail from "../controllers/peopleEmail.controller.js";
import { authenticate } from "../authorization/accessControl.js";

const router = Router();

router.get("/options", [authenticate], peopleEmail.options);
router.post("/recipients", [authenticate], peopleEmail.recipients);
router.post("/preview", [authenticate], peopleEmail.preview);
router.post("/", [authenticate], peopleEmail.send);

export default router;
