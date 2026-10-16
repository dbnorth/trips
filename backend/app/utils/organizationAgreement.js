import fs from "fs";
import path from "path";
import db from "../models/index.js";

const Organization = db.organization;

/** Directory for agreement Markdown files (override with AGREEMENTS_DIR for tests). */
export const getAgreementsDir = () => process.env.AGREEMENTS_DIR || "agreements";

export const AGREEMENT_KIND_PARTICIPANT = "participant-agreement";
export const AGREEMENT_KIND_MEDICAL = "medical-agreement";

const pad = (n) => String(n).padStart(2, "0");

/** Filesystem-safe stamp: 2026-07-18-155230 */
export const agreementVersionStamp = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return (
    [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join("-") +
    "-" +
    [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join("")
  );
};

export const agreementAbsolutePath = (relativePath) => path.resolve(relativePath || "");

const kindSlug = (kind = AGREEMENT_KIND_PARTICIPANT) =>
  kind === AGREEMENT_KIND_MEDICAL ? AGREEMENT_KIND_MEDICAL : AGREEMENT_KIND_PARTICIPANT;

const fileNameColumn = (kind) =>
  kind === AGREEMENT_KIND_MEDICAL ? "medicalAgreementFileName" : "agreementFileName";

export const agreementVersionRelativePath = (
  orgId,
  date = new Date(),
  kind = AGREEMENT_KIND_PARTICIPANT
) =>
  path
    .join(getAgreementsDir(), `org-${orgId}-${kindSlug(kind)}-${agreementVersionStamp(date)}.md`)
    .replace(/\\/g, "/");

/** Legacy unversioned path (pre-versioning). */
export const agreementRelativePath = (orgId, kind = AGREEMENT_KIND_PARTICIPANT) =>
  path.join(getAgreementsDir(), `org-${orgId}-${kindSlug(kind)}.md`).replace(/\\/g, "/");

const versionFileRegex = (orgId, kind = AGREEMENT_KIND_PARTICIPANT) =>
  new RegExp(`^org-${orgId}-${kindSlug(kind)}(?:-(\\d{4}-\\d{2}-\\d{2}-\\d{6}))?\\.md$`);

export const listAgreementVersions = (orgId, kind = AGREEMENT_KIND_PARTICIPANT) => {
  const dir = path.resolve(getAgreementsDir());
  if (!fs.existsSync(dir)) return [];

  const re = versionFileRegex(orgId, kind);
  return fs
    .readdirSync(dir)
    .map((name) => {
      const match = name.match(re);
      if (!match) return null;
      const relativePath = path.join(getAgreementsDir(), name).replace(/\\/g, "/");
      const stamp = match[1] || "0000-00-00-000000";
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(path.join(dir, name)).mtimeMs;
      } catch {
        /* ignore */
      }
      return { name, relativePath, stamp, mtimeMs };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.stamp !== b.stamp) return a.stamp < b.stamp ? 1 : -1;
      return b.mtimeMs - a.mtimeMs;
    });
};

export const resolveLatestAgreementPath = (
  orgId,
  preferredRelativePath = null,
  kind = AGREEMENT_KIND_PARTICIPANT
) => {
  const versions = listAgreementVersions(orgId, kind);
  if (versions.length) return versions[0].relativePath;

  if (preferredRelativePath) {
    const preferredAbs = agreementAbsolutePath(preferredRelativePath);
    if (fs.existsSync(preferredAbs)) return preferredRelativePath;
  }

  return null;
};

export const removeAgreementFile = (relativePath) => {
  if (!relativePath) return;
  const filePath = agreementAbsolutePath(relativePath);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore missing previous file */
    }
  }
};

export const removeAllAgreementVersions = (orgId, kind = AGREEMENT_KIND_PARTICIPANT) => {
  for (const version of listAgreementVersions(orgId, kind)) {
    removeAgreementFile(version.relativePath);
  }
};

export const removeAllOrgAgreementFiles = (orgId) => {
  removeAllAgreementVersions(orgId, AGREEMENT_KIND_PARTICIPANT);
  removeAllAgreementVersions(orgId, AGREEMENT_KIND_MEDICAL);
};

export const loadOrganizationAgreement = async (
  orgId,
  kind = AGREEMENT_KIND_PARTICIPANT
) => {
  const column = fileNameColumn(kind);
  const empty = { agreementFileName: null, exists: false, content: "" };
  if (orgId == null || orgId === "") return empty;

  const org = await Organization.findByPk(orgId, {
    attributes: ["id", column],
  });
  if (!org) return empty;

  const preferred = org[column];
  const relativePath = resolveLatestAgreementPath(org.id, preferred, kind);
  if (!relativePath) return empty;

  const filePath = agreementAbsolutePath(relativePath);
  if (!fs.existsSync(filePath)) {
    return { agreementFileName: relativePath, exists: false, content: "" };
  }

  if (preferred !== relativePath) {
    try {
      await org.update({ [column]: relativePath });
    } catch {
      /* non-fatal */
    }
  }

  return {
    agreementFileName: relativePath,
    exists: true,
    content: fs.readFileSync(filePath, "utf8"),
  };
};

export const loadOrganizationMedicalAgreement = (orgId) =>
  loadOrganizationAgreement(orgId, AGREEMENT_KIND_MEDICAL);
