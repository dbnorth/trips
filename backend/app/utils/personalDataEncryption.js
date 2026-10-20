import crypto from "crypto";
import Sequelize from "sequelize";
import logger from "../config/logger.js";
import { readSecret } from "./awsSecrets.js";

export const PII_KEY_READ_FAILED = "Could not read the personal data encryption key.";
export const PII_DECRYPT_FAILED = "Personal data could not be decrypted.";

/** Stored value: `enc1:` + base64(12-byte nonce, ciphertext, 16-byte tag). */
const PREFIX = "enc1:";
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

let personalDataKey = null;

const readKeyValue = async () => {
  const secretId = (process.env.PII_ENCRYPTION_KEY_SECRET_ID || "").trim();
  if (secretId) return readSecret(secretId);
  const value = process.env.PII_ENCRYPTION_KEY || "";
  if (!value.trim()) throw new Error("PII_ENCRYPTION_KEY is not set.");
  return value;
};

/** Read the 32-byte key from AWS Secrets Manager or `PII_ENCRYPTION_KEY` and keep it for this process. */
export const loadPersonalDataKey = async () => {
  try {
    const key = Buffer.from((await readKeyValue()).trim(), "base64");
    if (key.length !== 32) throw new Error("Key is not 32 bytes.");
    personalDataKey = key;
  } catch (err) {
    logger.error(`Reading the personal data encryption key failed: ${err.message}`);
    throw new Error(PII_KEY_READ_FAILED);
  }
};

const currentKey = () => {
  if (!personalDataKey) throw new Error(PII_KEY_READ_FAILED);
  return personalDataKey;
};

export const isEncryptedValue = (value) => typeof value === "string" && value.startsWith(PREFIX);

export const encryptValue = (text) => {
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", currentKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]).toString("base64");
};

const decryptValue = (key, stored) => {
  const data = Buffer.from(stored.slice(PREFIX.length), "base64");
  if (data.length < NONCE_BYTES + TAG_BYTES) throw new Error("Value is too short.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, data.subarray(0, NONCE_BYTES));
  decipher.setAuthTag(data.subarray(data.length - TAG_BYTES));
  return Buffer.concat([
    decipher.update(data.subarray(NONCE_BYTES, data.length - TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8");
};

const yesNoText = (value) => {
  if (value === "") return null;
  if ([true, 1, "1", "true"].includes(value)) return "1";
  if ([false, 0, "0", "false"].includes(value)) return "0";
  throw new Error("Invalid Yes/No value.");
};

const dateText = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (text === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) throw new Error("Invalid date.");
  return text.slice(0, 10);
};

const idListText = (ids) =>
  JSON.stringify(
    [...new Set((ids || []).map(Number).filter((id) => Number.isInteger(id)))].sort((a, b) => a - b)
  );

/** How each kind of value is written as text before encryption and read back. */
const KINDS = {
  text: { toText: (value) => String(value), fromText: (text) => text, fromLegacy: (value) => String(value) },
  yesNo: {
    toText: yesNoText,
    fromText: (text) => text === "1",
    fromLegacy: (value) => [true, 1, "1", "true"].includes(value),
  },
  date: { toText: dateText, fromText: (text) => text, fromLegacy: dateText },
  idList: {
    toText: idListText,
    fromText: (text) => JSON.parse(text),
    fromLegacy: (value) => JSON.parse(String(value)),
  },
};

/** Sequelize attribute stored encrypted in a `TEXT` column; reads return the original value and type. */
export const encryptedColumn = (kind) => {
  const { toText, fromText, fromLegacy } = KINDS[kind];
  return {
    type: Sequelize.TEXT,
    allowNull: true,
    get(name) {
      const stored = this.getDataValue(name);
      if (stored == null) return null;
      if (!isEncryptedValue(stored)) return fromLegacy(stored);
      const key = currentKey();
      try {
        return fromText(decryptValue(key, stored));
      } catch (err) {
        logger.error(
          `Decrypting ${this.constructor.tableName}.${name} for id ${this.getDataValue("id")} failed: ${err.message}`
        );
        throw new Error(PII_DECRYPT_FAILED);
      }
    },
    set(value, name) {
      const text = value == null ? null : toText(value);
      this.setDataValue(name, text == null ? null : encryptValue(text));
    },
  };
};
