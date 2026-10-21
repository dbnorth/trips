export default {
  secret: process.env.AUTH_SECRET || "trips-dev-secret",
  sessionHours: 4,
  maxFailedLogins: 5,
  lockMinutes: 15,
  resetLinkMinutes: 60,
  maxResetEmailsPerHour: 3,
};
