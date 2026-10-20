import crypto from "crypto";
import fs from "fs/promises";
import logger from "../config/logger.js";
import { readSecret } from "./awsSecrets.js";

export const KEY_READ_FAILED = "Could not read the document encryption key.";
export const DECRYPT_FAILED = "The document could not be decrypted.";

/** File layout: `TRIPSENC`, version byte, 12-byte nonce, ciphertext, 16-byte tag. */
const MAGIC = Buffer.from("TRIPSENC", "ascii");
const VERSION = 1;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + 1 + NONCE_BYTES;

const readKeyValue = async () => {
  const secretId = (process.env.FILE_ENCRYPTION_KEY_SECRET_ID || "").trim();
  if (secretId) return readSecret(secretId);
  const value = process.env.FILE_ENCRYPTION_KEY || "";
  if (!value.trim()) throw new Error("FILE_ENCRYPTION_KEY is not set.");
  return value;
};

/** The 32-byte document key from AWS Secrets Manager or `FILE_ENCRYPTION_KEY`. */
export const readDocumentKey = async () => {
  try {
    const key = Buffer.from((await readKeyValue()).trim(), "base64");
    if (key.length !== 32) throw new Error("Key is not 32 bytes.");
    return key;
  } catch (err) {
    logger.error(`Reading the document encryption key failed: ${err.message}`);
    throw new Error(KEY_READ_FAILED);
  }
};

export const isEncryptedDocument = (data) =>
  data.length >= MAGIC.length && data.subarray(0, MAGIC.length).equals(MAGIC);

export const encryptDocument = (key, plaintext) => {
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([MAGIC, Buffer.from([VERSION]), nonce, ciphertext, cipher.getAuthTag()]);
};

export const decryptDocument = (key, data) => {
  try {
    if (data.length < HEADER_BYTES + TAG_BYTES || data[MAGIC.length] !== VERSION) {
      throw new Error("Unknown or truncated encrypted file.");
    }
    const nonce = data.subarray(MAGIC.length + 1, HEADER_BYTES);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(data.subarray(data.length - TAG_BYTES));
    return Buffer.concat([
      decipher.update(data.subarray(HEADER_BYTES, data.length - TAG_BYTES)),
      decipher.final(),
    ]);
  } catch (err) {
    logger.error(`Decrypting a document failed: ${err.message}`);
    throw new Error(DECRYPT_FAILED);
  }
};

/** File contents as uploaded: decrypted, or as stored when written before encryption. */
export const readDocumentFile = async (filePath) => {
  const data = await fs.readFile(filePath);
  if (!isEncryptedDocument(data)) return data;
  return decryptDocument(await readDocumentKey(), data);
};
