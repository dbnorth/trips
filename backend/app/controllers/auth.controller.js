import crypto from "crypto";
import db from "../models/index.js";
import authconfig from "../config/auth.config.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import logger from "../config/logger.js";
import { ROLE_TRIP_PARTICIPANT } from "../authorization/accessControl.js";
import {
  normalizeEmail,
  findUserByEmail,
  findPersonByEmail,
  findPersonForUser,
  ensureUserForEmail,
  upsertPersonForUser,
  ensureOrgPeopleRole,
  updateUserPassword,
} from "../utils/userPerson.js";
import {
  normalizeSubdomainInput,
  findOrganizationBySubdomain,
} from "../utils/organizationSubdomain.js";
import { resolvePreferredName } from "../utils/preferredName.js";
import { sendSystemEmail } from "../utils/emailDelivery.js";

const User = db.user;
const Session = db.session;
const PasswordResetToken = db.passwordResetToken;
const Person = db.person;
const Organization = db.organization;
const OrgPeopleRole = db.orgPeopleRole;
const TripPeopleRole = db.tripPeopleRole;
const Role = db.role;
const Op = db.Sequelize.Op;

const SESSION_MS = authconfig.sessionHours * 60 * 60 * 1000;

const buildAuthPayload = async (user, token) => {
  const person = await Person.findOne({ where: { userId: user.id } });
  const orgRoles = person
    ? await OrgPeopleRole.findAll({
        where: { peopleId: person.id },
        include: [
          { model: db.organization, as: "organization", attributes: ["id", "name", "logo", "colorFamily"] },
          { model: Role, as: "role", attributes: ["id", "roleName"] },
        ],
      })
    : [];
  const tripRoles = person
    ? await TripPeopleRole.findAll({
        where: { peopleId: person.id, status: "approved" },
        include: [
          {
            model: db.trip,
            as: "trip",
            attributes: ["id", "name", "orgId", "status"],
            include: [
              { model: Organization, as: "organization", attributes: ["id", "name", "logo", "colorFamily"] },
            ],
          },
          { model: Role, as: "role", attributes: ["id", "roleName"] },
        ],
      })
    : [];

  return {
    email: user.email,
    userId: user.id,
    token,
    isAdmin: user.isAdmin,
    personId: person?.id ?? null,
    firstName: person?.firstName ?? "",
    middleName: person?.middleName ?? "",
    lastName: person?.lastName ?? "",
    orgRoles: orgRoles.map((r) => ({
      orgId: r.orgId,
      orgName: r.organization?.name,
      logo: r.organization?.logo,
      colorFamily: r.organization?.colorFamily,
      roleName: r.role?.roleName,
      roleId: r.roleId,
    })),
    tripRoles: tripRoles.map((r) => ({
      tripId: r.tripId,
      tripName: r.trip?.name,
      orgId: r.trip?.orgId,
      orgName: r.trip?.organization?.name,
      orgLogo: r.trip?.organization?.logo,
      orgColorFamily: r.trip?.organization?.colorFamily,
      tripStatus: r.trip?.status,
      roleName: r.role?.roleName,
      roleId: r.roleId,
    })),
  };
};

const sendAuthPayload = async (res, user, token) => {
  const payload = await buildAuthPayload(user, token);
  res.send(payload);
};

const createOrReuseSession = async (user, res) => {
  const email = user.email;

  const existing = await Session.findOne({
    where: { email, token: { [Op.ne]: "" } },
  });

  if (existing && existing.expirationDate >= Date.now()) {
    return sendAuthPayload(res, user, existing.token);
  }
  if (existing) {
    await Session.update({ token: "" }, { where: { id: existing.id } });
  }

  const token = jwt.sign({ id: email, sub: user.id }, authconfig.secret, {
    expiresIn: authconfig.sessionHours * 3600,
  });
  const expirationDate = new Date(Date.now() + SESSION_MS);

  await Session.create({ token, email, expirationDate, userId: user.id });
  await db.emailLog.create({
    toEmail: email,
    fromEmail: "system@missiontrips",
    subject: "Login",
    content: `User ${email} logged in at ${new Date().toISOString()}`,
    emailId: `login-${user.id}-${Date.now()}`,
  });
  sendAuthPayload(res, user, token);
};

const LOCKED_MESSAGE =
  "Too many failed sign-in attempts. Try again in 15 minutes or reset your password.";
const RESET_SENT_MESSAGE =
  "If an account exists for that email, we sent a link to reset your password. The link expires in 1 hour.";
const RESET_INVALID_MESSAGE = "This reset link is invalid or has expired. Please request a new one.";
const MINUTE_MS = 60 * 1000;

/** Count a wrong password; the last allowed one locks the account and starts the count again. */
const recordFailedLogin = async (user) => {
  const count = (user.failedLoginCount || 0) + 1;
  if (count >= authconfig.maxFailedLogins) {
    const lockedUntil = new Date(Date.now() + authconfig.lockMinutes * MINUTE_MS);
    await User.update({ failedLoginCount: 0, lockedUntil }, { where: { id: user.id } });
  } else {
    await User.update({ failedLoginCount: count }, { where: { id: user.id } });
  }
};

const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const appUrl = () => (process.env.APP_URL || "http://localhost:8082").replace(/\/+$/, "");

const resetEmailText = (firstName, link) =>
  [
    firstName ? `Hi ${firstName},` : "Hi,",
    "",
    "We received a request to reset the password for your Mission Trips account. To choose a new password, open this link within 1 hour:",
    "",
    link,
    "",
    "If you did not ask to reset your password, you can ignore this email. Your password will not change.",
    "",
    "Mission Trips",
  ].join("\n");

const sendResetEmail = async (user) => {
  const hourAgo = new Date(Date.now() - 60 * MINUTE_MS);
  const recent = await PasswordResetToken.count({
    where: { userId: user.id, createdAt: { [Op.gte]: hourAgo } },
  });
  if (recent >= authconfig.maxResetEmailsPerHour) return;

  const token = crypto.randomBytes(32).toString("base64url");
  await PasswordResetToken.update(
    { usedAt: new Date() },
    { where: { userId: user.id, usedAt: null } }
  );
  await PasswordResetToken.create({
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + authconfig.resetLinkMinutes * MINUTE_MS),
  });

  const person = await Person.findOne({ where: { userId: user.id }, attributes: ["id", "firstName"] });
  const firstName = person?.firstName?.trim() || "";
  const link = `${appUrl()}/reset-password?token=${token}`;
  await sendSystemEmail({
    to: user.email,
    subject: "Reset your Mission Trips password",
    text: resetEmailText(firstName, link),
    logText: resetEmailText(firstName, "[reset link]"),
    personId: person?.id ?? null,
  });
};

const exports = {};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).send({ message: "Email and password are required." });
  }
  const emailNorm = email.trim().toLowerCase();
  try {
    const user = await User.unscoped().findOne({
      where: { email: emailNorm },
      attributes: ["id", "email", "password", "isAdmin", "failedLoginCount", "lockedUntil"],
    });
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(429).send({ message: LOCKED_MESSAGE });
    }
    if (!user || !(await bcrypt.compare(password, user.password))) {
      if (user) await recordFailedLogin(user);
      return res.status(401).send({ message: "Invalid email or password." });
    }
    if (user.failedLoginCount || user.lockedUntil) {
      await User.update({ failedLoginCount: 0, lockedUntil: null }, { where: { id: user.id } });
    }
    await createOrReuseSession(user, res);
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    res.status(500).send({ message: err.message });
  }
};

exports.register = async (req, res) => {
  const { email, password, firstName, middleName, lastName, preferredName, orgIds, subdomain } = req.body;
  if (!email?.trim() || !password || !firstName?.trim() || !lastName?.trim()) {
    return res.status(400).send({ message: "First name, last name, email, and password are required." });
  }
  if (password.length < 8) {
    return res.status(400).send({ message: "Password must be at least 8 characters." });
  }

  const emailNorm = normalizeEmail(email);
  try {
    const participantRole = await Role.findOne({ where: { roleName: ROLE_TRIP_PARTICIPANT } });
    if (!participantRole) {
      return res.status(500).send({
        message: "Trip Participant role is not configured. Run npm run seed.",
      });
    }

    const requestedOrgIds = [
      ...new Set(
        (Array.isArray(orgIds) ? orgIds : [])
          .map((id) => parseInt(id, 10))
          .filter((id) => !Number.isNaN(id))
      ),
    ];

    const subdomainNorm = normalizeSubdomainInput(subdomain);
    if (subdomain != null && String(subdomain).trim() !== "" && !subdomainNorm) {
      return res.status(400).send({ message: "Invalid subdomain." });
    }
    if (subdomainNorm) {
      const subdomainOrg = await findOrganizationBySubdomain(subdomainNorm);
      if (!subdomainOrg) {
        return res.status(400).send({ message: "Unknown organization subdomain." });
      }
      if (!requestedOrgIds.includes(subdomainOrg.id)) {
        requestedOrgIds.push(subdomainOrg.id);
      }
    }

    const existingUser = await findUserByEmail(emailNorm);
    const existingPerson = existingUser
      ? await findPersonForUser(existingUser.id)
      : await findPersonByEmail(emailNorm);

    if (existingUser || existingPerson) {
      return res.status(409).send({
        message: "An account with this email already exists. Please log in instead.",
      });
    }

    const middleTrimmed =
      middleName == null || String(middleName).trim() === ""
        ? null
        : String(middleName).trim();

    const user = await ensureUserForEmail(emailNorm, password);
    const person = await upsertPersonForUser(user, {
      firstName,
      middleName: middleTrimmed,
      lastName,
      emailNorm,
      preferredName: resolvePreferredName(preferredName, firstName, lastName),
    });

    for (const orgId of requestedOrgIds) {
      const org = await Organization.findByPk(orgId);
      if (!org) continue;
      await ensureOrgPeopleRole(orgId, person.id, participantRole.id);
    }

    await createOrReuseSession(user, res);
  } catch (err) {
    logger.error(`Register error: ${err.message}`);
    res.status(500).send({ message: err.message });
  }
};

exports.listOrganizationsForRegister = async (_req, res) => {
  try {
    const orgs = await Organization.findAll({
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });
    res.send(orgs);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findOrganizationBySubdomainForRegister = async (req, res) => {
  try {
    const subdomain = normalizeSubdomainInput(req.params.subdomain);
    if (!subdomain) {
      return res.status(404).send({ message: "Organization not found." });
    }
    const org = await findOrganizationBySubdomain(subdomain);
    if (!org) {
      return res.status(404).send({ message: "Organization not found." });
    }
    res.send({ id: org.id, name: org.name, subdomain: org.subdomain });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const rows = await Session.findAll({ where: { token: req.body?.token } });
    if (rows[0]) {
      await Session.update({ token: "" }, { where: { id: rows[0].id } });
    }
    res.send({ message: "User has been successfully logged out!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).send({ message: "User not found." });
    const payload = await buildAuthPayload(user, req.get("authorization")?.slice(7) || "");
    res.send(payload);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).send({ message: "Current password and new password are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).send({ message: "New password must be at least 8 characters." });
  }

  try {
    const user = await User.unscoped().findByPk(req.user.id, {
      attributes: ["id", "password"],
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).send({ message: "Current password is incorrect." });
    }
    await updateUserPassword(user.id, newPassword);
    res.send({ message: "Password updated." });
  } catch (err) {
    logger.error(`Change password error: ${err.message}`);
    res.status(500).send({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).send({ message: "Email is required." });
  }
  try {
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (user) await sendResetEmail(user);
    res.send({ message: RESET_SENT_MESSAGE });
  } catch (err) {
    logger.error(`Forgot password error: ${err.message}`);
    res.status(500).send({ message: "Unable to send the reset link. Please try again." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).send({ message: "Password must be at least 8 characters." });
  }
  try {
    const row =
      typeof token === "string" && token
        ? await PasswordResetToken.findOne({ where: { tokenHash: hashResetToken(token) } })
        : null;
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return res.status(400).send({ message: RESET_INVALID_MESSAGE });
    }
    await updateUserPassword(row.userId, newPassword);
    await PasswordResetToken.update(
      { usedAt: new Date() },
      { where: { userId: row.userId, usedAt: null } }
    );
    await Session.update({ token: "" }, { where: { userId: row.userId } });
    await User.update({ failedLoginCount: 0, lockedUntil: null }, { where: { id: row.userId } });
    res.send({ message: "Your password has been reset. Please sign in." });
  } catch (err) {
    logger.error(`Reset password error: ${err.message}`);
    res.status(500).send({ message: "Unable to reset the password. Please try again." });
  }
};

export default exports;
