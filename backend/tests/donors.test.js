/**
 * Feature 130 — Donor Maintenance
 * Spec: features/feature-130-donor-maintenance.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { ensureSchema } from "../app/scripts/ensureSchema.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  createSystemAdminUser,
  registerUser,
} from "./helpers.js";

describe("Feature 130 — Donor Maintenance", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const addDonor = (auth, fields) =>
    request(app).post("/trips/donors").set(auth).send({ status: "active", ...fields });

  it("The list is one organization", async () => {
    const hope = await createOrgAdminUser({ email: "hope-admin@example.com", orgName: "Hope Mission" });
    const other = await createOrgAdminUser({ email: "other-admin@example.com", orgName: "Other Mission" });
    const created = await addDonor(hope.authHeader, { firstName: "Ana", lastName: "Lopez", email: "ana@example.com" });
    expect(created.status).toBe(200);

    const hopeList = await request(app).get("/trips/donors").set(hope.authHeader);
    const otherList = await request(app).get("/trips/donors").set(other.authHeader);
    expect(hopeList.status).toBe(200);
    expect(hopeList.body.map((donor) => donor.firstName)).toEqual(["Ana"]);
    expect(otherList.body).toEqual([]);

    const system = await createSystemAdminUser({ email: "donors-sys@example.com" });
    const allOrgs = await request(app).get("/trips/donors").set(system.authHeader);
    expect(allOrgs.status).toBe(400);
    expect(allOrgs.body.message).toBe("Select an organization in the menu bar.");
  });

  it("Add donor saves in the organization", async () => {
    const hope = await createOrgAdminUser({ email: "hope-add@example.com", orgName: "Hope Mission" });
    const other = await createOrgAdminUser({ email: "other-add@example.com", orgName: "Other Mission" });

    const created = await addDonor(hope.authHeader, {
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
    });
    expect(created.status).toBe(200);
    expect(created.body.orgId).toBe(hope.org.id);

    const hopeList = await request(app).get("/trips/donors").set(hope.authHeader);
    const otherList = await request(app).get("/trips/donors").set(other.authHeader);
    expect(hopeList.body.map((donor) => donor.email)).toEqual(["pat@example.com"]);
    expect(otherList.body).toEqual([]);
  });

  it("The same email may be a donor of another organization", async () => {
    const hope = await createOrgAdminUser({ email: "hope-email@example.com", orgName: "Hope Mission" });
    const other = await createOrgAdminUser({ email: "other-email@example.com", orgName: "Other Mission" });
    await addDonor(hope.authHeader, { firstName: "Pat", email: "pat@example.com" });

    const saved = await addDonor(other.authHeader, { firstName: "Pat", email: "pat@example.com" });
    expect(saved.status).toBe(200);

    const again = await addDonor(other.authHeader, { firstName: "Pat", email: "Pat@Example.com" });
    expect(again.status).toBe(400);
    expect(again.body.message).toBe("A donor with this email already exists.");
  });

  it("Edit donor keeps the organization", async () => {
    const hope = await createOrgAdminUser({ email: "hope-edit@example.com", orgName: "Hope Mission" });
    const other = await createOrgAdminUser({ email: "other-edit@example.com", orgName: "Other Mission" });
    const created = await addDonor(hope.authHeader, { firstName: "Ana", lastName: "Lopez", city: "Austin" });

    const updated = await request(app)
      .put(`/trips/donors/${created.body.id}`)
      .set(hope.authHeader)
      .send({ city: "Dallas", orgId: other.org.id, version: created.body.version });
    expect(updated.status).toBe(200);
    expect(updated.body.city).toBe("Dallas");
    expect(updated.body.orgId).toBe(hope.org.id);

    const hopeList = await request(app).get("/trips/donors").set(hope.authHeader);
    const otherList = await request(app).get("/trips/donors").set(other.authHeader);
    expect(hopeList.body.map((donor) => donor.id)).toEqual([created.body.id]);
    expect(otherList.body).toEqual([]);
  });

  const contactList = (body) =>
    ["Donor full name,Phone numbers,Email,Full name,Bill address,Ship address", body].join("\n");

  const importFile = (auth, content, filename = "donors.csv") =>
    request(app)
      .post("/trips/donors/import")
      .set(auth)
      .attach("file", Buffer.from(content), { filename, contentType: "text/csv" });

  it("Import adds donors from the contact list", async () => {
    const hope = await createOrgAdminUser({ email: "hope-import@example.com", orgName: "Hope Mission" });
    const csv = contactList(
      [
        "60,,,,,",
        "Aaron Redelsperger,Phone:(615) 370-9849 ,aaronsperger@gmail.com,Aaron  Redelsperger,607 Quail Meadow Dr Mount Shasta CA 96067-9170,",
      ].join("\n")
    );

    const imported = await importFile(hope.authHeader, csv);
    expect(imported.status).toBe(200);
    expect(imported.body).toEqual({ rowCount: 2, added: 1, updated: 0, skipped: 1 });

    const donors = await db.donor.findAll({ where: { orgId: hope.org.id } });
    expect(donors).toHaveLength(1);
    expect(donors[0]).toMatchObject({
      firstName: "Aaron",
      lastName: "Redelsperger",
      email: "aaronsperger@gmail.com",
      addLine1: "607 Quail Meadow Dr",
      city: "Mount Shasta",
      state_prov: "CA",
      postalCode: "96067-9170",
      country: "US",
      phoneContryCode: "1",
      phoneNumber: "6153709849",
      status: "active",
      personId: null,
    });
  });

  it("A donor type must be Organization or Individual", async () => {
    const hope = await createOrgAdminUser({ email: "hope-type@example.com", orgName: "Hope Mission" });
    const refused = await addDonor(hope.authHeader, { firstName: "Pat", donorType: "company" });
    expect(refused.status).toBe(400);
    expect(refused.body.message).toBe("Donor type must be Organization or Individual.");

    const missing = await addDonor(hope.authHeader, { donorType: "organization" });
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe("Organization name is required.");

    const church = await addDonor(hope.authHeader, {
      donorType: "organization",
      organizationName: "Hope Church",
      firstName: "Hope",
      lastName: "Church",
    });
    expect(church.status).toBe(200);
    expect(church.body).toMatchObject({
      organizationName: "Hope Church",
      firstName: null,
      lastName: null,
      donorType: "organization",
    });
  });

  it("Import sets Donor type from the name", async () => {
    const hope = await createOrgAdminUser({ email: "hope-kind@example.com", orgName: "Hope Mission" });
    const csv = contactList(
      [
        "Aaron Redelsperger,,aaronsperger@gmail.com,Aaron  Redelsperger,,",
        "Alison Jones,,alison@example.com,Alison C  Jones,,",
        "Brian,,brian@example.com,Brian,,",
        "Abilene Christian University (Dpnor),,,,",
        "A & L Lawncare,,,,",
        "HOPE FUND,,hope-fund@example.com,HOPE FUND,,",
      ].join("\n")
    );

    const imported = await importFile(hope.authHeader, csv);
    expect(imported.status).toBe(200);

    const donors = await db.donor.findAll({ where: { orgId: hope.org.id } });
    const named = (email) => donors.find((donor) => donor.email === email);
    expect(named("aaronsperger@gmail.com")).toMatchObject({
      donorType: "individual",
      firstName: "Aaron",
      lastName: "Redelsperger",
    });
    expect(named("alison@example.com")).toMatchObject({
      donorType: "individual",
      firstName: "Alison",
      lastName: "Jones",
    });
    expect(named("brian@example.com")).toMatchObject({ donorType: "individual", firstName: "Brian", lastName: null });
    expect(donors.find((donor) => donor.organizationName === "Abilene Christian University")).toMatchObject({
      donorType: "organization",
      firstName: null,
      lastName: null,
    });
    expect(donors.find((donor) => donor.familyName === "A & L Lawncare")).toMatchObject({
      donorType: "individual",
      firstName: "A",
      lastName: "Lawncare",
      organizationName: null,
    });
    expect(named("hope-fund@example.com")).toMatchObject({
      donorType: "organization",
      organizationName: "HOPE FUND",
      firstName: null,
      lastName: null,
    });
  });

  it("Import updates the name and type of an existing donor", async () => {
    const hope = await createOrgAdminUser({ email: "hope-retype@example.com", orgName: "Hope Mission" });
    await db.donor.create({
      orgId: hope.org.id,
      firstName: "Alison C",
      lastName: "Jones",
      email: "alison@example.com",
      donorType: "individual",
      status: "active",
    });
    await db.donor.create({
      orgId: hope.org.id,
      firstName: "Abilene Christian University",
      donorType: "individual",
      status: "active",
    });
    await db.donor.create({
      orgId: hope.org.id,
      firstName: "Adam & Deb",
      lastName: "Dingwell",
      donorType: "individual",
      status: "active",
    });
    const csv = contactList(
      [
        "Alison Jones,,alison@example.com,Alison C  Jones,,",
        "Abilene Christian University (Dpnor),,,,",
        "Adam & Deb Dingwell,,,Adam & Deb  Dingwell,,",
      ].join("\n")
    );

    const imported = await importFile(hope.authHeader, csv);
    expect(imported.status).toBe(200);
    expect(imported.body).toMatchObject({ added: 0, updated: 3 });

    const donors = await db.donor.findAll({ where: { orgId: hope.org.id } });
    expect(donors).toHaveLength(3);
    expect(donors.find((donor) => donor.email === "alison@example.com")).toMatchObject({
      donorType: "individual",
      firstName: "Alison",
      lastName: "Jones",
      organizationName: null,
    });
    expect(donors.find((donor) => donor.organizationName === "Abilene Christian University")).toMatchObject({
      donorType: "organization",
      firstName: null,
      lastName: null,
    });
    expect(donors.find((donor) => donor.familyName === "Adam & Deb Dingwell")).toMatchObject({
      donorType: "individual",
      firstName: "Adam",
      lastName: "Dingwell",
      organizationName: null,
    });
  });

  it("An existing email or the same name is updated", async () => {
    const hope = await createOrgAdminUser({ email: "hope-update@example.com", orgName: "Hope Mission" });
    await addDonor(hope.authHeader, { firstName: "Pat", lastName: "Lee", email: "pat@example.com", city: "Cabot" });
    await addDonor(hope.authHeader, { firstName: "Ana", lastName: "Lopez", city: "Austin" });
    const csv = contactList(
      [
        "Pat Lee,,pat@example.com,Pat  Lee,20 Dalewood Dr Searcy AR 72143,",
        "Ana Lopez,,ana@example.com,Ana  Lopez,,",
      ].join("\n")
    );

    const imported = await importFile(hope.authHeader, csv);
    expect(imported.status).toBe(200);
    expect(imported.body).toMatchObject({ added: 0, updated: 2 });

    const donors = await db.donor.findAll({ where: { orgId: hope.org.id }, order: [["firstName", "ASC"]] });
    expect(donors).toHaveLength(2);
    expect(donors.map((donor) => donor.firstName)).toEqual(["Ana", "Pat"]);
    expect(donors[0].email).toBe("ana@example.com");
    expect(donors[1].city).toBe("Searcy");
    expect(donors[1].state_prov).toBe("AR");
  });

  it("Import stays in the organization", async () => {
    const hope = await createOrgAdminUser({ email: "hope-scope@example.com", orgName: "Hope Mission" });
    const other = await createOrgAdminUser({ email: "other-scope@example.com", orgName: "Other Mission" });
    await addDonor(other.authHeader, { firstName: "Pat", lastName: "Lee", email: "pat@example.com", city: "Cabot" });
    const csv = contactList("Pat Lee,,pat@example.com,Pat  Lee,20 Dalewood Dr Searcy AR 72143,");

    const imported = await importFile(hope.authHeader, csv);
    expect(imported.status).toBe(200);
    expect(imported.body).toMatchObject({ added: 1, updated: 0 });

    const hopeDonor = await db.donor.findOne({ where: { orgId: hope.org.id } });
    const otherDonor = await db.donor.findOne({ where: { orgId: other.org.id } });
    expect(hopeDonor.city).toBe("Searcy");
    expect(otherDonor.city).toBe("Cabot");
  });

  it("Import needs this contact list", async () => {
    const hope = await createOrgAdminUser({ email: "hope-columns@example.com", orgName: "Hope Mission" });
    const csv = "Donor full name,Phone numbers,Full name,Bill address,Ship address\nPat,,Pat  Lee,,";

    const imported = await importFile(hope.authHeader, csv);
    expect(imported.status).toBe(400);
    expect(imported.body.message).toBe("This file isn't a donor contact list. Missing columns: Email.");
  });

  it("Import is for organization admins", async () => {
    const person = await registerUser({ email: "member-import@example.com" });
    const csv = contactList("Pat Lee,,pat@example.com,Pat  Lee,,");
    const refused = await importFile(person.authHeader, csv);
    expect(refused.status).toBe(403);
    expect(refused.body.message).toBe("Forbidden.");

    const system = await createSystemAdminUser({ email: "import-sys@example.com" });
    const allOrgs = await importFile(system.authHeader, csv);
    expect(allOrgs.status).toBe(400);
    expect(allOrgs.body.message).toBe("Select an organization in the menu bar.");
  });

  it("An existing donor who gave to two organizations is split", async () => {
    const hope = await createOrgAdminUser({ email: "hope-split@example.com", orgName: "Hope Mission" });
    const other = await createOrgAdminUser({ email: "other-split@example.com", orgName: "Other Mission" });
    const person = await registerUser({ email: "ana-split@example.com", firstName: "Ana", lastName: "Lopez" });
    const hopeTrip = await db.trip.create({ orgId: hope.org.id, name: "Hope Trip", status: "active" });
    const otherTrip = await db.trip.create({ orgId: other.org.id, name: "Other Trip", status: "active" });
    const donor = await db.donor.create({
      firstName: "Ana",
      lastName: "Lopez",
      email: "ana@example.com",
      city: "Austin",
      orgId: hope.org.id,
      personId: person.user.personId,
    });

    await db.sequelize.query("ALTER TABLE donors MODIFY orgId INT NULL");
    await db.sequelize.query("UPDATE donors SET orgId = NULL WHERE id = :id", { replacements: { id: donor.id } });
    const hopeGift = await db.tripDonation.create({
      tripId: hopeTrip.id,
      donorId: donor.id,
      amount: 40,
      dateTime: "2025-03-02T18:00:00.000Z",
    });
    const otherGift = await db.tripDonation.create({
      tripId: otherTrip.id,
      donorId: donor.id,
      amount: 15,
      dateTime: "2025-11-20T18:00:00.000Z",
    });

    await ensureSchema();

    const donors = await db.donor.findAll({ order: [["orgId", "ASC"]] });
    expect(donors).toHaveLength(2);
    const hopeDonor = donors.find((row) => row.orgId === hope.org.id);
    const otherDonor = donors.find((row) => row.orgId === other.org.id);
    expect(hopeDonor).toMatchObject({
      id: donor.id,
      firstName: "Ana",
      email: "ana@example.com",
      personId: person.user.personId,
    });
    expect(otherDonor).toMatchObject({ firstName: "Ana", email: "ana@example.com", personId: null });
    expect((await hopeGift.reload()).donorId).toBe(hopeDonor.id);
    expect((await otherGift.reload()).donorId).toBe(otherDonor.id);
  });
});
