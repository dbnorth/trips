import db from "../models/index.js";

const Language = db.language;
const PersonLanguage = db.personLanguage;

export const normalizeTriState = (value) => {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return null;
};

export const fluencyLabel = (fluency) =>
  fluency === "conversational" ? "Conversational" : fluency === "basic" ? "Basic" : "";

/**
 * Validate language rows. Returns { ok, status, message, rows }.
 * `rows` is ready to insert when ok.
 */
export const validateLanguageRows = async (languages) => {
  if (!Array.isArray(languages) || languages.length === 0) {
    return { ok: false, status: 400, message: "Add at least one language." };
  }

  const seen = new Set();
  const rows = [];

  for (const raw of languages) {
    const languageId = Number(raw?.languageId);
    const fluency = String(raw?.fluency || "").trim().toLowerCase();
    const knows = normalizeTriState(raw?.knowsMedicalTerminology);

    if (!Number.isInteger(languageId) || languageId <= 0) {
      return {
        ok: false,
        status: 400,
        message: "Each language row needs a language from the catalog.",
      };
    }
    if (seen.has(languageId)) {
      return { ok: false, status: 400, message: "The same language cannot be saved twice." };
    }
    seen.add(languageId);

    if (fluency !== "basic" && fluency !== "conversational") {
      return { ok: false, status: 400, message: "Fluency must be Basic or Conversational." };
    }
    if (knows !== true && knows !== false) {
      return {
        ok: false,
        status: 400,
        message: "Medical terminology must be Yes or No for each language.",
      };
    }

    const language = await Language.findByPk(languageId);
    if (!language) {
      return { ok: false, status: 400, message: "Unknown language." };
    }

    rows.push({
      languageId,
      fluency,
      knowsMedicalTerminology: knows,
    });
  }

  return { ok: true, rows };
};

export const replacePersonLanguages = async (personId, rows) => {
  await PersonLanguage.destroy({ where: { personId } });
  if (rows.length) {
    await PersonLanguage.bulkCreate(rows.map((row) => ({ personId, ...row })));
  }
};

export const clearPersonLanguages = async (personId) => {
  await PersonLanguage.destroy({ where: { personId } });
};

export const loadPersonLanguages = async (personId) => {
  const links = await PersonLanguage.findAll({
    where: { personId },
    include: [
      {
        model: Language,
        as: "language",
        attributes: ["id", "code", "name"],
      },
    ],
  });

  return links
    .map((link) => {
      const json = link.toJSON();
      const language = json.language;
      if (!language) return null;
      return {
        languageId: language.id,
        code: language.code,
        name: language.name,
        fluency: json.fluency,
        knowsMedicalTerminology: !!json.knowsMedicalTerminology,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
};
