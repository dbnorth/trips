import { Router } from "express";
import airlines from "../controllers/airline.controller.js";
import authenticate from "../authorization/accessControl.js";

const router = Router();

router.get("/", [authenticate], airlines.findAll);
router.post("/", [authenticate], airlines.create);
router.put("/:id", [authenticate], airlines.update);
router.delete("/:id", [authenticate], airlines.delete);

export default router;
