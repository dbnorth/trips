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
