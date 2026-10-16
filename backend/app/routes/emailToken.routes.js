import { Router } from "express";
import emailTokens from "../controllers/emailToken.controller.js";
import authenticate from "../authorization/accessControl.js";

const router = Router();

router.get("/", [authenticate], emailTokens.findAll);
router.get("/value-sources", [authenticate], emailTokens.valueSources);
router.get("/:id", [authenticate], emailTokens.findOne);
router.post("/", [authenticate], emailTokens.create);
router.put("/:id", [authenticate], emailTokens.update);
router.delete("/:id", [authenticate], emailTokens.delete);

export default router;
