/** Feature 80 — reading a Trip Master spreadsheet saved as CSV. */

const COLUMNS = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "E-Mail",
  position: "Position Required",
  appReceived: "App Received",
  middleName: "Middle Name",
  birthDate: "Date of Birth",
  phone: "Phone # Cell",
  roommate: "Roommate",
  gender: "Gender",
  address: "Address",
  city: "City",
  state: "State",
  zip: "Zip",
  emergencyContact: "Emergency Contact",
  allergies: "Allergies",
  church: "Church Affiliation",
  passportNumber: "Passport Number",
  passportExpiration: "Passport Exp. Date",
  travelNotes: "Travel Notes",
  flightFee: "Flight Fee",
  hasNameTag: "Do you Have a Name Tag",
  departureCity: "Departure City",
  arrivalCity: "Arrival City",
};

const REQUIRED = ["firstName", "lastName", "email", "position"];

/** Records of CSV text; quoted fields may hold commas, quotes, and line breaks. */
export const parseCsv = (input) => {
  const text = input.replace(/^\uFEFF/, "");
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else quoted = false;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }
  return records;
};

export const normalizeText = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** Index of each known column, by its two header rows joined (a column may add trailing words). */
const findColumns = (first = [], second = []) => {
  const headers = Array.from({ length: Math.max(first.length, second.length) }, (_, i) =>
    normalizeText(`${first[i] ?? ""} ${second[i] ?? ""}`)
  );
  const columns = {};
  for (const [key, name] of Object.entries(COLUMNS)) {
    const wanted = normalizeText(name);
    const index = headers.findIndex((header) => header === wanted || header.startsWith(`${wanted} `));
    if (index >= 0) columns[key] = index;
  }
  return columns;
};

const isWaitingListHeading = (position) => {
  const value = normalizeText(position);
  return value.startsWith("caregiver waiting list") || value.endsWith("waiting list");
};

const HEADER_SEARCH_ROWS = 10;

/**
 * The columns of the first pair of rows (starting in the first 10) holding every required column,
 * with the index of the pair's first row; otherwise the required columns missing from the pair
 * that found the most.
 */
const findHeader = (records) => {
  let closest = null;
  for (let start = 0; start < Math.min(HEADER_SEARCH_ROWS, records.length); start += 1) {
    const columns = findColumns(records[start], records[start + 1]);
    const missing = REQUIRED.filter((key) => columns[key] == null).map((key) => COLUMNS[key]);
    if (!missing.length) return { start, columns, missing };
    if (!closest || missing.length < closest.missing.length) closest = { missing };
  }
  return closest || { missing: REQUIRED.map((key) => COLUMNS[key]) };
};

/**
 * The spreadsheet's rows by section, or the required columns it is missing. The two header rows
 * may have any rows above them; `row` is the spreadsheet row number. Rows after "Total" and before
 * the next section heading belong to no section and are left out.
 */
export const readTripMaster = (text) => {
  const records = parseCsv(text);
  const { start, columns, missing } = findHeader(records);
  if (missing.length) return { missing, rows: [] };

  const firstDataRow = start + 2;
  const rows = [];
  let section = "main";
  records.slice(firstDataRow).forEach((record, index) => {
    const values = {};
    for (const [key, column] of Object.entries(columns)) values[key] = String(record[column] ?? "").trim();

    const position = normalizeText(values.position);
    let heading = true;
    if (position === "cancellations") section = "cancelled";
    else if (isWaitingListHeading(values.position)) section = "waiting";
    else heading = false;

    if (section === "main" && position === "total") {
      section = null;
      return;
    }
    if (!section) return;
    rows.push({ ...values, position: heading ? "" : values.position, row: firstDataRow + index + 1, section });
  });
  return { missing: [], rows };
};

/** `YYYY-MM-DD` from M/D/YY, M/D/YYYY, or MM-DD-YYYY; null when it isn't a date. */
export const parseSheetDate = (raw, { birthDate = false } = {}) => {
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(String(raw ?? "").trim());
  if (!match) return null;
  const [month, day] = [Number(match[1]), Number(match[2])];
  let year = Number(match[3]);
  if (match[3].length === 2) {
    year += 2000;
    if (birthDate && year > new Date().getFullYear()) year -= 100;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

/** The 10 US digits of a phone number, or null. */
export const parseSheetPhone = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return null;
};

/** Name and phone from text like "Nathan Lowry (937)570-6904"; without a phone the whole text is the name. */
export const parseEmergencyContact = (raw) => {
  const text = String(raw ?? "").trim();
  const runs = [...text.matchAll(/[\d()+\-.\s]*\d[\d()+\-.\s]*/g)];
  for (const run of runs.reverse()) {
    const phone = parseSheetPhone(run[0]);
    if (!phone) continue;
    const name = text.slice(0, run.index).trim().replace(/,$/, "").trim();
    return { name: name || null, phone };
  }
  return { name: text || null, phone: null };
};

/** Have allergies? and the description; null when blank. */
export const parseAllergies = (raw) => {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  if (["none", "no", "n/a", "na"].includes(text.toLowerCase())) return { hasAllergies: false };
  return { hasAllergies: true, description: text };
};

/** Amount from "$1,175.00", "1175", or "$0.00"; null when it isn't a number. */
export const parseMoney = (raw) => {
  const text = String(raw ?? "").replace(/[$,\s]/g, "");
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : null;
};

/** Lower-case words without accents, split at anything that isn't a letter or digit. */
const wordsOf = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** A trip option whose description has a word starting with "flight" or "air". */
export const isFlightOption = (option) =>
  wordsOf(option.description).some((word) => word.startsWith("flight") || word.startsWith("air"));

/** A trip option whose description has the words "name" and "tag" (e.g. "Need HTI Name Tag"). */
export const isNameTagOption = (option) => {
  const words = wordsOf(option.description);
  return words.includes("name") && words.includes("tag");
};

const NEGATIONS = new Set(["no", "not"]);

/**
 * The option per set that Travel Notes pick, and the sets where options tie. Sets are matched lowest
 * first. Keywords are an option's 3+ character words found in no other option of its set. A word
 * after "no"/"not" picks the other of two options, or none. Words that pick an option aren't matched
 * in later sets; negated words are never used up.
 */
export const chooseNoteOptions = (notes, options) => {
  const words = wordsOf(notes);
  const isNegated = (index) => index > 0 && NEGATIONS.has(words[index - 1]);
  const negated = words.filter((word, index) => word.length >= 3 && isNegated(index));
  let unused = words.filter((word, index) => word.length >= 3 && !NEGATIONS.has(word) && !isNegated(index));

  const bySet = new Map();
  for (const option of options) {
    if (isFlightOption(option) || isNameTagOption(option)) continue;
    const setNumber = Number(option.setNumber) > 0 ? Number(option.setNumber) : 1;
    bySet.set(setNumber, [...(bySet.get(setNumber) || []), option]);
  }

  const chosen = [];
  const tiedSets = [];
  for (const [setNumber, setOptions] of [...bySet.entries()].sort((a, b) => a[0] - b[0])) {
    const optionWords = setOptions.map((option) => new Set(wordsOf(option.description)));
    const keywords = optionWords.map((own) =>
      [...own].filter((word) => word.length >= 3 && optionWords.every((other) => other === own || !other.has(word)))
    );
    const matches = (noteWords, index) =>
      keywords[index].filter((keyword) => noteWords.some((word) => keyword.startsWith(word))).length;

    const negatedIndex = setOptions.findIndex((_, index) => matches(negated, index) > 0);
    if (negatedIndex >= 0) {
      if (setOptions.length === 2) chosen.push(setOptions[1 - negatedIndex]);
      continue;
    }

    const scores = setOptions.map((_, index) => matches(unused, index));
    const best = Math.max(0, ...scores);
    if (!best) continue;
    const top = scores.flatMap((score, index) => (score === best ? [index] : []));
    if (top.length > 1) {
      tiedSets.push(setNumber);
      continue;
    }
    chosen.push(setOptions[top[0]]);
    unused = unused.filter((word) => !keywords[top[0]].some((keyword) => keyword.startsWith(word)));
  }
  return { chosen, tiedSets };
};
