import { Router } from "express";
import auth from "../controllers/auth.controller.js";
import authenticate from "../authorization/accessControl.js";
import { loginLimiter, passwordResetLimiter } from "../authorization/rateLimits.js";

const router = Router();

router.post("/login", loginLimiter, auth.login);
router.post("/register", auth.register);
router.get("/register/organizations", auth.listOrganizationsForRegister);
router.get(
  "/register/organizations/by-subdomain/:subdomain",
  auth.findOrganizationBySubdomainForRegister
);
router.post("/logout", auth.logout);
router.post("/change-password", [authenticate], auth.changePassword);
router.post("/forgot-password", passwordResetLimiter, auth.forgotPassword);
router.post("/reset-password", passwordResetLimiter, auth.resetPassword);
router.get("/me", [authenticate], auth.me);

export default router;
