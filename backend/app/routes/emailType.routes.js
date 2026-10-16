import { Router } from "express";
import emailTypes from "../controllers/emailType.controller.js";
import authenticate from "../authorization/accessControl.js";

const router = Router();

router.get("/", [authenticate], emailTypes.findAll);
router.get("/:id", [authenticate], emailTypes.findOne);
router.post("/", [authenticate], emailTypes.create);
router.put("/:id", [authenticate], emailTypes.update);
router.delete("/:id", [authenticate], emailTypes.delete);

export default router;
