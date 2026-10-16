import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { buildTokenValues, substituteRecipients, substituteTokens } from "./emailTokenValues.js";

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Tests replace `create` so smtp mode never reaches a real mail server. */
export const emailTransport = {
  create: (options) => nodemailer.createTransport(options),
};

const readSettings = () => {
  const env = process.env;
  return {
    mode: (env.EMAIL_MODE || "").trim() === "smtp" ? "smtp" : "file",
    fileDir: path.resolve(backendDir, env.EMAIL_FILE_DIR || "test-mail"),
    host: env.SMTP_HOST || "localhost",
    port: Number(env.SMTP_PORT) || 25,
    secure: env.SMTP_SECURE === "true",
    user: env.SMTP_USER || "",
    password: env.SMTP_PASSWORD || "",
    sender: (env.EMAIL_SENDER || "").trim(),
  };
};

const fileStamp = (date) =>
  date.toISOString().replace(/[-:]/g, "").replace("T", "-").replace(".", "-").replace("Z", "");

const writeMessageFile = async (dir, message) => {
  await fs.mkdir(dir, { recursive: true });
  const sentAt = new Date();
  const fileName = `${fileStamp(sentAt)}-${crypto.randomBytes(3).toString("hex")}.txt`;
  const lines = [`Date: ${sentAt.toISOString()}`, `From: ${message.from}`];
  if (message.replyTo) lines.push(`Reply-To: ${message.replyTo}`);
  lines.push(`To: ${message.to}`, `Subject: ${message.subject}`, "", message.text);
  await fs.writeFile(path.join(dir, fileName), lines.join("\n"), "utf8");
  return fileName;
};

const deliver = async (settings, message) => {
  if (settings.mode === "file") return writeMessageFile(settings.fileDir, message);
  const transport = emailTransport.create({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    ...(settings.user ? { auth: { user: settings.user, pass: settings.password } } : {}),
  });
  const info = await transport.sendMail(message);
  return info.messageId;
};

/**
 * Send one template to one trip participant with tokens filled in, and record it in `emailLog`.
 * Returns `{ status: "sent", emailLogId }`, `{ status: "skipped", reason }`, or `{ status: "failed", reason }`.
 */
export const sendTemplateEmail = async ({ template, tripId, personId }) => {
  const values = await buildTokenValues({ orgId: template.orgId, tripId, personId });
  const to = substituteRecipients(template.toAddress, values);
  if (!to) return { status: "skipped", reason: "No recipients." };
  const templateFrom = substituteTokens(template.fromEmail, values).trim();
  if (!templateFrom) return { status: "skipped", reason: "No sender." };

  const settings = readSettings();
  const message = {
    from: settings.sender || templateFrom,
    to,
    subject: substituteTokens(template.subject, values),
    text: substituteTokens(template.emailBody, values),
  };
  if (settings.sender) message.replyTo = templateFrom;

  let emailId;
  try {
    emailId = await deliver(settings, message);
  } catch (err) {
    logger.error(`Email to ${to} failed: ${err.message}`);
    return { status: "failed", reason: err.message };
  }

  const log = await db.emailLog.create({
    toEmail: to,
    fromEmail: message.from,
    subject: message.subject,
    content: message.text,
    emailId,
    emailTemplateId: template.id,
    tripId,
    personId,
  });
  return { status: "sent", emailLogId: log.id };
};
