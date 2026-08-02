import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";

const CATALOG_ROLES = [
  { roleName: "Org Admin", roleDescription: "Organization administrator" },
  { roleName: "Trip Leader", roleDescription: "Leader for a specific trip" },
  { roleName: "Trip Participant", roleDescription: "Participant on a trip" },
  { roleName: "Pending User", roleDescription: "Awaiting organization approval" },
];

export const syncTestDatabase = async () => {
  await db.sequelize.sync({ force: true });
  await seedRoles();
};

export const seedRoles = async () => {
  for (const r of CATALOG_ROLES) {
    const existing = await db.role.findOne({ where: { roleName: r.roleName } });
    if (!existing) await db.role.create(r);
  }
};

export const resetTestDatabase = async () => {
  const ordered = [
    db.tripPeopleRoleOption,
    db.tripDonation,
    db.personDocument,
    db.tripPeopleRole,
    db.tripWorkerRole,
    db.tripTravelOption,
    db.emailTemplate,
    db.emailLog,
    db.orgPeopleRole,
    db.trip,
    db.workerRole,
    db.donor,
    db.person,
    db.session,
    db.user,
    db.organization,
    db.documentType,
    db.role,
  ];

  for (const model of ordered) {
    if (model) await model.destroy({ where: {}, force: true });
  }

  await seedRoles();
};

export const registerUser = async (overrides = {}) => {
  const payload = {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    password: "password123",
    ...overrides,
  };

  const response = await request(app).post("/trips/register").send(payload);

  return {
    response,
    user: response.body,
    token: response.body.token,
    authHeader: { Authorization: `Bearer ${response.body.token}` },
  };
};

export const createOrganization = async (name = "Hope Mission") => {
  return db.organization.create({ name });
};

export const findRole = async (roleName) => {
  return db.role.findOne({ where: { roleName } });
};

/** Assign or replace a person's org role (e.g. promote to Org Admin). */
export const assignOrgRole = async (orgId, peopleId, roleName) => {
  const role = await findRole(roleName);
  if (!role) throw new Error(`Role not seeded: ${roleName}`);
  const existing = await db.orgPeopleRole.findOne({ where: { orgId, peopleId } });
  if (existing) {
    await existing.update({ roleId: role.id });
    return existing;
  }
  return db.orgPeopleRole.create({ orgId, peopleId, roleId: role.id, version: 0 });
};

/** Register a user and promote them to Org Admin for a new (or given) organization. */
export const createOrgAdminUser = async ({
  email = "orgadmin@example.com",
  orgName = "Admin Org",
  org = null,
} = {}) => {
  const organization = org || (await createOrganization(orgName));
  const reg = await registerUser({
    email,
    firstName: "Org",
    lastName: "Admin",
    orgIds: [organization.id],
  });
  await assignOrgRole(organization.id, reg.user.personId, "Org Admin");
  return { ...reg, org: organization };
};

/** Register a user and set `isAdmin` so subsequent authenticated requests are system admin. */
export const createSystemAdminUser = async ({
  email = "sysadmin@example.com",
} = {}) => {
  const reg = await registerUser({
    email,
    firstName: "Sys",
    lastName: "Admin",
  });
  await db.user.update({ isAdmin: true }, { where: { id: reg.user.userId } });
  return reg;
};

/** Fill required person profile fields so `isProfileComplete` returns true. */
export const completePersonProfile = async (personId, overrides = {}) => {
  await db.person.update(
    {
      addLine1: "123 Main St",
      city: "Springfield",
      country: "US",
      state_prov: "IL",
      postalCode: "62701",
      phoneContryCode: "1",
      phoneNumber: "5551234567",
      birthDate: "1990-05-15",
      gender: "female",
      emergencyContactName: "Sam Contact",
      emergencyContactPhoneCountryCode: "1",
      emergencyContactPhoneNumber: "5559876543",
      hasAllergies: false,
      currentChurchHome: "First Church",
      currentChurchHomeCity: "Springfield",
      currentChurchHomeStateProv: "IL",
      ...overrides,
    },
    { where: { id: personId } }
  );
};

/** 1×1 PNG used for picture upload tests. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
