import { rateLimit, MemoryStore } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const TOO_MANY_MESSAGE = { message: "Too many attempts. Please try again later." };

const loginStore = new MemoryStore();
const passwordResetStore = new MemoryStore();

/** Failed sign-ins per IP address (successful sign-ins do not count). */
export const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: TOO_MANY_MESSAGE,
  store: loginStore,
});

/** Forgot-password and reset-password requests per IP address, counted together. */
export const passwordResetLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: TOO_MANY_MESSAGE,
  store: passwordResetStore,
});

/** Tests share one app; clear the counts between them. */
export const resetRateLimits = async () => {
  await loginStore.resetAll();
  await passwordResetStore.resetAll();
};
