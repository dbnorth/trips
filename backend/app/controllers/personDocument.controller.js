import db from "../models/index.js";
import fs from "fs";
import path from "path";
import {
  encryptDocument,
  readDocumentFile,
  readDocumentKey,
} from "../utils/documentEncryption.js";

const Person = db.person;
const PersonDocument = db.personDocument;
const PersonDocumentSpecialization = db.personDocumentSpecialization;
const DocumentType = db.documentType;
const OrgPeopleRole = db.orgPeopleRole;
const Op = db.Sequelize.Op;
const exports = {};

const REVIEWED_LOCKED_MESSAGE = "Reviewed documents can't be changed.";

export const canManagePerson = async (req, personId) => {
  if (req.user?.isAdmin) return true;
  if (req.user?.personId && Number(req.user.personId) === Number(personId)) return true;
  const orgIds = (req.user?.orgRoles || [])
    .filter((r) => r.role?.roleName === "Org Admin" || r.roleName === "Org Admin")
    .map((r) => r.orgId);
  if (!orgIds.length) return false;
  const link = await OrgPeopleRole.findOne({
    where: { peopleId: personId, orgId: { [Op.in]: orgIds } },
  });
  return !!link;
};

const includeDocumentType = [
  {
    model: DocumentType,
    as: "documentType",
    attributes: [
      "id",
      "description",
      "type",
      "documentNumberRequired",
      "instructions",
      "allowSpecialization",
      "hasExpirationDate",
      "expirationCheck",
    ],
  },
  {
    model: PersonDocumentSpecialization,
    as: "specializations",
    attributes: ["id", "documentTypeSpecializationId", "specializationDate", "documentFileName"],
    include: [
      {
        model: db.documentTypeSpecialization,
        as: "documentTypeSpecialization",
        attributes: ["id", "name"],
      },
    ],
  },
];

const documentPath = (documentFileName) => path.join("documents", documentFileName || "");

const removeDocumentFile = (documentFileName) => {
  if (!documentFileName) return;
  try {
    fs.unlinkSync(documentPath(documentFileName));
  } catch {
    /* ignore missing previous file */
  }
};

const uploadedFiles = (req) => {
  const files = [];
  if (req.file) files.push(req.file);
  for (const group of Object.values(req.files || {})) {
    if (Array.isArray(group)) files.push(...group);
  }
  return files;
};

const primaryDocumentFile = (req) => req.files?.document?.[0] || req.file || null;

const specializationFiles = (req) => req.files?.specializationFiles || [];

const cleanupUploadedFile = (req) => {
  for (const file of uploadedFiles(req)) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore cleanup errors */
    }
  }
};

const storedFileName = (file) => path.join("people", file.filename).replace(/\\/g, "/");

/** Encrypt and write the uploaded files that will be saved; `cleanupUploadedFile` removes them. */
const writeEncryptedFiles = async (files) => {
  const toWrite = files.filter(Boolean);
  if (!toWrite.length) return;
  const key = await readDocumentKey();
  for (const file of toWrite) {
    const filePath = documentPath(storedFileName(file));
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, encryptDocument(key, file.buffer));
    file.path = filePath;
  }
};

const planFiles = (plan) => (plan.skip ? [] : plan.prepared.map((item) => item.file));

const SPECIALIZATION_INVALID =
  "Each specialization needs a name, a date, and a file.";

const parseSpecializations = (body) => {
  if (!Object.prototype.hasOwnProperty.call(body, "specializations")) {
    return { present: false, rows: [] };
  }
  let raw = body.specializations;
  if (raw == null || raw === "") return { present: true, rows: [] };
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { error: "Specializations are invalid." };
    }
  }
  if (!Array.isArray(raw)) return { error: "Specializations are invalid." };
  return { present: true, rows: raw };
};

const prepareSpecializations = (rows, files, existingById, listIds) => {
  const prepared = [];
  const chosen = new Set();
  let fileIndex = 0;
  for (const row of rows) {
    const specializationId = Number(row?.documentTypeSpecializationId);
    const date = row?.date == null ? "" : String(row.date).trim();
    if (!Number.isInteger(specializationId) || specializationId < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: SPECIALIZATION_INVALID };
    }
    if (!listIds.has(specializationId)) {
      return { error: "Specialization is not in the list for this document type." };
    }
    if (chosen.has(specializationId)) {
      return { error: "Each specialization can be added only once per document." };
    }
    chosen.add(specializationId);
    const id = row?.id != null && row.id !== "" ? Number(row.id) : null;
    if (Number.isInteger(id) && id > 0 && !existingById.get(id)) {
      return { error: "Specialization not found." };
    }
    const current = Number.isInteger(id) ? existingById.get(id) : null;
    const replaceFile = row?.replaceFile === true || row?.replaceFile === "true";
    if (current && !replaceFile) {
      prepared.push({
        id: current.id,
        specializationId,
        date,
        documentFileName: current.documentFileName,
        file: null,
      });
      continue;
    }
    const file = files[fileIndex++];
    if (!file) return { error: SPECIALIZATION_INVALID };
    prepared.push({
      id: current?.id ?? null,
      specializationId,
      date,
      documentFileName: storedFileName(file),
      file,
    });
  }
  return { prepared };
};

const persistSpecializations = async (personDocumentId, prepared, existingRows) => {
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const keptIds = new Set(prepared.filter((item) => item.id).map((item) => item.id));
  for (const row of existingRows) {
    if (keptIds.has(row.id)) continue;
    removeDocumentFile(row.documentFileName);
    await row.destroy();
  }
  for (const item of prepared) {
    if (item.id) {
      const row = existingById.get(item.id);
      if (item.file) removeDocumentFile(row.documentFileName);
      await row.update({
        documentTypeSpecializationId: item.specializationId,
        specializationDate: item.date,
        documentFileName: item.documentFileName,
      });
    } else {
      await PersonDocumentSpecialization.create({
        personDocumentId,
        documentTypeSpecializationId: item.specializationId,
        specializationDate: item.date,
        documentFileName: item.documentFileName,
      });
    }
  }
};

const resolveSpecializationPlan = async (body, documentType, files, personDocumentId) => {
  const parsed = parseSpecializations(body);
  if (parsed.error) return parsed;
  if (!documentType.allowSpecialization) {
    if (parsed.present && parsed.rows.length) {
      return { error: "Specializations are not allowed for this document type." };
    }
    return { skip: true };
  }
  if (!parsed.present) return { skip: true };

  const existing = personDocumentId
    ? await PersonDocumentSpecialization.findAll({ where: { personDocumentId } })
    : [];
  const existingById = new Map(existing.map((row) => [row.id, row]));
  const list = await db.documentTypeSpecialization.findAll({
    where: { documentTypeId: documentType.id },
    attributes: ["id"],
  });
  const listIds = new Set(list.map((row) => Number(row.id)));
  const prepared = prepareSpecializations(parsed.rows, files, existingById, listIds);
  if (prepared.error) return prepared;
  return { skip: false, prepared: prepared.prepared, existing };
};

const serializeDocument = (row) => {
  const json = row.toJSON();
  json.specializations = (json.specializations || []).map((item) => ({
    id: item.id,
    documentTypeSpecializationId: item.documentTypeSpecializationId,
    name: item.documentTypeSpecialization?.name ?? null,
    date: item.specializationDate,
    documentFileName: item.documentFileName,
  }));
  return json;
};

const normalizeDocumentNumber = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const validatePayload = async (body) => {
  const documentTypeId = Number(body.documentTypeId);
  if (!Number.isInteger(documentTypeId) || documentTypeId < 1) {
    return { error: "Document type is required." };
  }
  const documentType = await DocumentType.findByPk(documentTypeId);
  if (!documentType) return { error: "Document type not found." };

  if (documentType.hasExpirationDate && !body.expirationDate) {
    return { error: "Expiration date is required." };
  }

  let documentNumber = null;
  if (documentType.documentNumberRequired) {
    documentNumber = normalizeDocumentNumber(body.documentNumber);
    if (!documentNumber) {
      return { error: "Document number is required." };
    }
  }

  return {
    documentType,
    payload: {
      documentTypeId,
      countryIssued: body.countryIssued?.trim()?.toUpperCase() || null,
      documentNumber,
      issueDate: body.issueDate || null,
      expirationDate:
        documentType.hasExpirationDate || documentType.type === "doctor_permission"
          ? body.expirationDate || null
          : null,
    },
  };
};

const DETAIL_FIELDS = ["documentTypeId", "countryIssued", "documentNumber", "issueDate", "expirationDate"];

const documentDetailsChanged = (row, payload) =>
  DETAIL_FIELDS.some((field) => {
    const before = row[field] == null ? "" : String(row[field]);
    const after = payload[field] == null ? "" : String(payload[field]);
    return field.endsWith("Date") ? before.slice(0, 10) !== after.slice(0, 10) : before !== after;
  });

const specializationsChanged = (plan) => {
  if (plan.skip) return false;
  if (plan.prepared.length !== plan.existing.length) return true;
  const existingById = new Map(plan.existing.map((row) => [row.id, row]));
  return plan.prepared.some((item) => {
    const current = item.id ? existingById.get(item.id) : null;
    return (
      !current ||
      !!item.file ||
      Number(current.documentTypeSpecializationId) !== item.specializationId ||
      String(current.specializationDate || "").slice(0, 10) !== item.date
    );
  });
};

const loadForPerson = (id, personId) =>
  PersonDocument.findOne({
    where: { id, personId },
    include: includeDocumentType,
    order: [[{ model: PersonDocumentSpecialization, as: "specializations" }, "id", "ASC"]],
  });

exports.findAll = async (req, res) => {
  try {
    const person = await Person.findByPk(req.params.id);
    if (!person) return res.status(404).send({ message: "Person not found." });
    if (!(await canManagePerson(req, person.id))) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const data = await PersonDocument.findAll({
      where: { personId: person.id },
      include: includeDocumentType,
      order: [
        [{ model: DocumentType, as: "documentType" }, "description", "ASC"],
        ["expirationDate", "ASC"],
        [{ model: PersonDocumentSpecialization, as: "specializations" }, "id", "ASC"],
      ],
    });
    res.send(data.map(serializeDocument));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const person = await Person.findByPk(req.params.id);
    if (!person) {
      cleanupUploadedFile(req);
      return res.status(404).send({ message: "Person not found." });
    }
    if (!(await canManagePerson(req, person.id))) {
      cleanupUploadedFile(req);
      return res.status(403).send({ message: "Forbidden." });
    }

    const result = await validatePayload(req.body);
    if (result.error) {
      cleanupUploadedFile(req);
      return res.status(400).send({ message: result.error });
    }

    const plan = await resolveSpecializationPlan(
      req.body,
      result.documentType,
      specializationFiles(req),
      null
    );
    if (plan.error) {
      cleanupUploadedFile(req);
      return res.status(400).send({ message: plan.error });
    }

    const documentFile = primaryDocumentFile(req);
    await writeEncryptedFiles([documentFile, ...planFiles(plan)]);
    const data = await PersonDocument.create({
      personId: person.id,
      ...result.payload,
      documentFileName: documentFile ? storedFileName(documentFile) : null,
    });

    if (!plan.skip) {
      await persistSpecializations(data.id, plan.prepared, []);
    }

    res.send(serializeDocument(await loadForPerson(data.id, person.id)));
  } catch (err) {
    cleanupUploadedFile(req);
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const person = await Person.findByPk(req.params.id);
    if (!person) {
      cleanupUploadedFile(req);
      return res.status(404).send({ message: "Person not found." });
    }
    if (!(await canManagePerson(req, person.id))) {
      cleanupUploadedFile(req);
      return res.status(403).send({ message: "Forbidden." });
    }

    const row = await PersonDocument.findOne({
      where: { id: req.params.documentId, personId: person.id },
    });
    if (!row) {
      cleanupUploadedFile(req);
      return res.status(404).send({ message: "Document not found." });
    }
    if (row.reviewed) {
      cleanupUploadedFile(req);
      return res.status(400).send({ message: REVIEWED_LOCKED_MESSAGE });
    }

    const updated = await updatePersonDocument(req, res, row);
    if (updated) res.send(serializeDocument(updated));
  } catch (err) {
    cleanupUploadedFile(req);
    res.status(500).send({ message: err.message });
  }
};

/**
 * Apply a multipart document update to an unreviewed row (profile rules). Sends the 400 and returns
 * null when invalid; otherwise returns the reloaded document. A new file clears the reload request.
 */
export const updatePersonDocument = async (req, res, row) => {
  const result = await validatePayload(req.body);
  if (result.error) {
    cleanupUploadedFile(req);
    res.status(400).send({ message: result.error });
    return null;
  }

  const payload = { ...result.payload };
  const documentFile = primaryDocumentFile(req);
  if (documentFile) {
    payload.documentFileName = storedFileName(documentFile);
    payload.reloadRequestedAt = null;
  }

  const plan = await resolveSpecializationPlan(
    req.body,
    result.documentType,
    specializationFiles(req),
    row.id
  );
  if (plan.error) {
    cleanupUploadedFile(req);
    res.status(400).send({ message: plan.error });
    return null;
  }

  if (documentFile || documentDetailsChanged(row, payload) || specializationsChanged(plan)) {
    payload.reviewed = false;
  }

  await writeEncryptedFiles([documentFile, ...planFiles(plan)]);
  if (documentFile) removeDocumentFile(row.documentFileName);
  await row.update(payload);
  if (!plan.skip) {
    await persistSpecializations(row.id, plan.prepared, plan.existing);
  }
  return loadForPerson(row.id, row.personId);
};

export { cleanupUploadedFile, serializeDocument };

export const sendDocumentFile = async (res, documentFileName, { inline }) => {
  const filePath = documentPath(documentFileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: "Document file not found." });
  }

  const data = await readDocumentFile(filePath);
  const fileName = path.basename(documentFileName);
  if (inline) {
    res.type(path.extname(fileName));
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  } else {
    res.attachment(fileName);
  }
  return res.send(data);
};

const serveDocument = async (req, res, { inline }) => {
  const person = await Person.findByPk(req.params.id);
  if (!person) return res.status(404).send({ message: "Person not found." });
  if (!(await canManagePerson(req, person.id))) {
    return res.status(403).send({ message: "Forbidden." });
  }

  const row = await PersonDocument.findOne({
    where: { id: req.params.documentId, personId: person.id },
  });
  if (!row) return res.status(404).send({ message: "Document not found." });

  return sendDocumentFile(res, row.documentFileName, { inline });
};

exports.view = async (req, res) => {
  try {
    await serveDocument(req, res, { inline: true });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.download = async (req, res) => {
  try {
    await serveDocument(req, res, { inline: false });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const serveSpecialization = async (req, res, { inline }) => {
  const person = await Person.findByPk(req.params.id);
  if (!person) return res.status(404).send({ message: "Person not found." });
  if (!(await canManagePerson(req, person.id))) {
    return res.status(403).send({ message: "Forbidden." });
  }

  const document = await PersonDocument.findOne({
    where: { id: req.params.documentId, personId: person.id },
  });
  if (!document) return res.status(404).send({ message: "Document not found." });

  const row = await PersonDocumentSpecialization.findOne({
    where: { id: req.params.specializationId, personDocumentId: document.id },
  });
  if (!row) return res.status(404).send({ message: "Specialization not found." });

  return sendDocumentFile(res, row.documentFileName, { inline });
};

exports.viewSpecialization = async (req, res) => {
  try {
    await serveSpecialization(req, res, { inline: true });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.downloadSpecialization = async (req, res) => {
  try {
    await serveSpecialization(req, res, { inline: false });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const person = await Person.findByPk(req.params.id);
    if (!person) return res.status(404).send({ message: "Person not found." });
    if (!(await canManagePerson(req, person.id))) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const row = await PersonDocument.findOne({
      where: { id: req.params.documentId, personId: person.id },
    });
    if (!row) return res.status(404).send({ message: "Document not found." });
    if (row.reviewed) return res.status(400).send({ message: REVIEWED_LOCKED_MESSAGE });

    const specs = await PersonDocumentSpecialization.findAll({
      where: { personDocumentId: row.id },
    });
    for (const spec of specs) removeDocumentFile(spec.documentFileName);
    removeDocumentFile(row.documentFileName);
    await row.destroy();
    res.send({ message: "Document deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
