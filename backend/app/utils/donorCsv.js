/** Feature 130 — a QuickBooks donor contact list saved as CSV. */

import { parseCsv, parseSheetPhone } from "./tripMasterCsv.js";
import { normalizeEmail } from "./userPerson.js";

const COLUMNS = {
  donorName: "Donor full name",
  phone: "Phone numbers",
  email: "Email",
  fullName: "Full name",
  billAddress: "Bill address",
  shipAddress: "Ship address",
};

const STREET_SUFFIXES = new Set([
  "st",
  "street",
  "ave",
  "avenue",
  "rd",
  "road",
  "dr",
  "drive",
  "ln",
  "lane",
  "blvd",
  "boulevard",
  "ct",
  "court",
  "cir",
  "circle",
  "way",
  "pl",
  "place",
  "hwy",
  "highway",
  "pkwy",
  "parkway",
  "ter",
  "terrace",
  "trl",
  "trail",
  "path",
  "pike",
  "box",
  "terr",
  "cv",
  "cove",
  "crst",
  "crest",
  "crt",
  "trce",
  "trace",
]);

const collapse = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

const headerName = (value) => collapse(value).toLowerCase();

/** Column indexes for a donor contact list, and the display names that are missing. */
export const findDonorColumns = (header = []) => {
  const columns = {};
  const missing = [];
  header.forEach((cell, index) => {
    const name = headerName(cell);
    for (const [key, label] of Object.entries(COLUMNS)) {
      if (name === label.toLowerCase()) columns[key] = index;
    }
  });
  for (const [key, label] of Object.entries(COLUMNS)) {
    if (columns[key] == null) missing.push(label);
  }
  return { columns, missing };
};

const cleanDonorName = (raw) =>
  collapse(String(raw ?? "").replace(/&amp;/gi, "&").replace(/\s*\((?:donor|dpnor)\)\s*$/i, ""));

/** Church, college, university, company, "c of c", or a name written in all capitals. */
export const isOrganizationDonorName = (raw) => {
  const text = cleanDonorName(raw);
  if (!text) return false;
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters && letters === letters.toUpperCase()) return true;
  return /\b(church|college|university|company)\b/i.test(text) || /\bc\s+of\s+c\b/i.test(text);
};

/** Organization name, or an individual's first, last, and family name. A middle name or initial is left out. Null when the row has no donor name. */
export const splitDonorName = (raw) => {
  const text = cleanDonorName(raw);
  if (!text || /^\d+$/.test(text)) return null;
  const word = (value) => value.replace(/\.$/, "");
  if (text.includes("&")) {
    const before = collapse(text.slice(0, text.indexOf("&")));
    const words = text.split(" ");
    return {
      donorType: "individual",
      organizationName: "",
      familyName: text,
      firstName: word(before),
      lastName: words.length > 1 ? word(words[words.length - 1]) : "",
      sourceName: text,
    };
  }
  if (isOrganizationDonorName(text)) {
    return {
      donorType: "organization",
      organizationName: text,
      familyName: "",
      firstName: "",
      lastName: "",
      sourceName: text,
    };
  }
  const words = text.split(" ");
  return {
    donorType: "individual",
    organizationName: "",
    familyName: "",
    firstName: word(words[0]),
    lastName: words.length > 1 ? word(words[words.length - 1]) : "",
    sourceName: text,
  };
};

/** US country code and digits, or the leftover phone text when it is not a 10-digit US number. */
export const parseDonorPhone = (raw) => {
  const text = collapse(raw);
  if (!text) return null;
  const digits = parseSheetPhone(text);
  if (digits) return { phoneContryCode: "1", phoneNumber: digits };
  const cleaned = text.replace(/^phone:\s*/i, "").trim();
  return cleaned ? { phoneContryCode: null, phoneNumber: cleaned } : null;
};

const wordKey = (word) => word.replace(/[.,#]/g, "").toLowerCase();

/** Bill or ship address split into the donor address fields. Null when the cell is blank. */
export const parseDonorAddress = (raw) => {
  const text = collapse(raw);
  if (!text) return null;
  const match = text.match(/^(.*)\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!match) {
    return { addLine1: text, addLine2: null, city: null, state_prov: null, postalCode: null, country: null };
  }
  const words = match[1].trim().split(" ");
  let suffixAt = -1;
  for (let i = words.length - 1; i >= 0; i -= 1) {
    if (STREET_SUFFIXES.has(wordKey(words[i]))) {
      suffixAt = i;
      break;
    }
  }
  let lineEnd = words.length;
  let city = null;
  if (suffixAt < 0 && words.length >= 2) {
    lineEnd = words.length - 1;
    city = words[words.length - 1];
  } else if (suffixAt >= 0) {
    let cityStart = suffixAt + 1;
    if (wordKey(words[suffixAt]) === "box" && cityStart < words.length && /^\d/.test(words[cityStart])) {
      cityStart += 1;
    }
    while (cityStart < words.length && words[cityStart].startsWith("#")) cityStart += 1;
    if (cityStart < words.length) {
      lineEnd = cityStart;
      city = words.slice(cityStart).join(" ");
    }
  }
  if (!city && words.length >= 2 && wordKey(words.at(-1)) === "road" && wordKey(words.at(-2)) === "pike") {
    lineEnd = words.length - 2;
    city = words.slice(-2).join(" ");
  }
  return {
    addLine1: words.slice(0, lineEnd).join(" "),
    addLine2: null,
    city,
    state_prov: match[2].toUpperCase(),
    postalCode: match[3],
    country: "US",
  };
};

const cell = (record, index) => (index == null ? "" : record[index] ?? "");

/** Data rows of a donor contact list. `missing` names the required columns that are absent. */
export const readDonorContactList = (input) => {
  const records = parseCsv(String(input ?? ""));
  const [header = [], ...rest] = records.filter((record) => record.some((item) => collapse(item)));
  const { columns, missing } = findDonorColumns(header);
  if (missing.length) return { missing, rows: [] };
  const rows = [];
  rest.forEach((record, index) => {
    const fullName = cell(record, columns.fullName);
    const named = collapse(fullName) ? fullName : cell(record, columns.donorName);
    const name = splitDonorName(named);
    const address = parseDonorAddress(cell(record, columns.billAddress) || cell(record, columns.shipAddress));
    rows.push({
      row: index + 2,
      name,
      email: normalizeEmail(cell(record, columns.email)),
      phone: parseDonorPhone(cell(record, columns.phone)),
      address,
    });
  });
  return { missing: [], rows };
};
