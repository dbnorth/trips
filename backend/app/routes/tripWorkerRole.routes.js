import { Router } from "express";
import twr from "../controllers/tripWorkerRole.controller.js";
import authenticate from "../authorization/accessControl.js";

const router = Router();

router.get("/", [authenticate], twr.findAll);
router.post("/", [authenticate], twr.create);
router.put("/:id", [authenticate], twr.update);
router.delete("/:id", [authenticate], twr.delete);
router.get("/:id/reservations", [authenticate], twr.findReservations);
router.post("/:id/reservations", [authenticate], twr.addReservations);
router.delete("/:id/reservations/:reservationId", [authenticate], twr.deleteReservation);

export default router;
