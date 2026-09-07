import { Router } from "express";
import airports from "../controllers/airport.controller.js";
import authenticate from "../authorization/accessControl.js";

const router = Router();

router.get("/", [authenticate], airports.findAll);
router.post("/", [authenticate], airports.create);
router.put("/:id", [authenticate], airports.update);
router.delete("/:id", [authenticate], airports.delete);

export default router;
