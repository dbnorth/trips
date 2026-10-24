import crypto from "crypto";
import bcrypt from "bcryptjs";
import db from "../models/index.js";

const User = db.user;
const Person = db.person;
// Minimum bcrypt cost under Jest only; full cost everywhere else.
const SALT_ROUNDS = process.env.NODE_ENV === "test" ? 4 : 10;

export const normalizeEmail = (email) => email?.trim()?.toLowerCase() || null;

export const generateTempPassword = () => crypto.randomBytes(24).toString("hex");

export const findUserByEmail = (emailNorm) =>
  User.unscoped().findOne({ where: { email: emailNorm } });

export const findPersonByEmail = (emailNorm) =>
  Person.findOne({ where: { email: emailNorm } });

export const findPersonForUser = (userId) => Person.findOne({ where: { userId } });

const sameName = (a, b) =>
  String(a ?? "").trim().replace(/\s+/g, " ").toLowerCase() ===
  String(b ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * The person a new login with this email is linked to: undefined when a person with the email
 * already has a login, otherwise the one with the entered name, else the only one, else null.
 */
export const findPersonToLink = async (emailNorm, firstName, lastName) => {
  const people = await Person.findAll({ where: { email: emailNorm }, order: [["id", "ASC"]] });
  if (people.some((person) => person.userId)) return undefined;
  const named = people.find(
    (person) => sameName(person.firstName, firstName) && sameName(person.lastName, lastName)
  );
  if (named) return named;
  return people.length === 1 ? people[0] : null;
};

/** Resolve user linked to person via userId or matching email. */
export const resolveLinkedUser = async (person) => {
  if (person.userId) {
    const user = await User.findByPk(person.userId, { attributes: ["id", "email", "isAdmin"] });
    if (user) return user;
  }
  const emailNorm = normalizeEmail(person.email);
  if (emailNorm) {
    return findUserByEmail(emailNorm);
  }
  return null;
};

/** Persist person.userId when a matching user exists. */
export const linkPersonToUser = async (person, user) => {
  if (!user) return person;
  if (Number(person.userId) !== Number(user.id)) {
    await person.update({ userId: user.id });
  }
  return person;
};

/** Create user or return existing user for email. Uses password if valid (8+ chars), else random temp password. */
export const ensureUserForEmail = async (emailNorm, password) => {
  let user = await findUserByEmail(emailNorm);
  if (user) return user;

  const useProvidedPassword = password && password.length >= 8;
  const pwd = useProvidedPassword ? password : generateTempPassword();
  const hash = await bcrypt.hash(pwd, SALT_ROUNDS);
  user = await User.create({
    email: emailNorm,
    password: hash,
    isAdmin: false,
    passwordSetByUser: useProvidedPassword,
  });
  return user;
};

/** Update user password when registering or resetting from login flow. */
export const updateUserPassword = async (userId, password) => {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  await User.update({ password: hash, passwordSetByUser: true }, { where: { id: userId } });
};

/**
 * Apply a password from the public registration flow.
 * Keeps existing passwords when the user already chose one.
 */
export const applyRegistrationPassword = async (userId, password) => {
  const user = await User.unscoped().findByPk(userId, {
    attributes: ["id", "password", "passwordSetByUser"],
  });
  if (!user) return { ok: false, status: 404, message: "User not found." };

  const matches = await bcrypt.compare(password, user.password);
  const accountExistsMessage = "An account with this email already exists. Please sign in.";

  if (user.passwordSetByUser) {
    if (!matches) {
      return { ok: false, status: 409, message: accountExistsMessage };
    }
    return { ok: true };
  }

  if (matches) {
    await User.update({ passwordSetByUser: true }, { where: { id: userId } });
    return { ok: true };
  }

  const hasSessionHistory = await db.session.count({ where: { userId } });
  if (hasSessionHistory > 0) {
    return { ok: false, status: 409, message: accountExistsMessage };
  }

  await updateUserPassword(userId, password);
  return { ok: true };
};

/**
 * Find or create person linked to user. Updates name/email on existing person.
 * `person` (when given) is the person to link, or null to create one.
 * Returns person instance.
 */
export const upsertPersonForUser = async (
  user,
  { firstName, middleName, lastName, emailNorm, ...extraFields },
  { mergeOptional = false, person: chosenPerson } = {}
) => {
  let person =
    chosenPerson !== undefined
      ? chosenPerson
      : (await findPersonForUser(user.id)) ||
        (emailNorm ? await findPersonByEmail(emailNorm) : null);

  const personPayload = {
    firstName: firstName?.trim(),
    lastName: lastName?.trim(),
    email: emailNorm,
    userId: user.id,
  };

  if (middleName !== undefined) {
    const trimmed = middleName == null ? "" : String(middleName).trim();
    personPayload.middleName = trimmed === "" ? null : trimmed;
  }

  for (const [key, val] of Object.entries(extraFields)) {
    if (val === undefined) continue;
    if (mergeOptional && (val === null || val === "")) continue;
    personPayload[key] = val;
  }

  if (person) {
    await person.update(personPayload);
    return person;
  }

  return Person.create(personPayload);
};

/** Ensure OrgPeopleRole exists for org/person/role; allows multiple roles per organization. */
export const ensureOrgPeopleRole = async (orgId, peopleId, roleId) => {
  const existing = await db.orgPeopleRole.findOne({ where: { orgId, peopleId, roleId } });
  if (existing) {
    return { link: existing, created: false, roleUpdated: false };
  }
  const link = await db.orgPeopleRole.create({ orgId, peopleId, roleId });
  return { link, created: true, roleUpdated: false };
};
