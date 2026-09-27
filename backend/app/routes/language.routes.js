import { Router } from "express";
import languages from "../controllers/language.controller.js";
import authenticate from "../authorization/accessControl.js";

const router = Router();

router.get("/", [authenticate], languages.findAll);

export default router;
