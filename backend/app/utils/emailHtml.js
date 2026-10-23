import fs from "fs/promises";
import path from "path";
import sanitizeHtml from "sanitize-html";
import db from "../models/index.js";
import { substituteTokens } from "./emailTokenValues.js";

export const PICTURE_DIR = path.resolve("images", "email-pictures");
const PICTURE_URL_PREFIX = "images/email-pictures/";
const MAX_PICTURES_BYTES = 5 * 1024 * 1024;

export const PICTURES_FOREIGN = "Pictures must come from this organization's library.";
const PICTURES_TOO_LARGE = "Pictures in one email must total 5 MB or less.";
const PICTURES_GLOBAL = "Global templates cannot include pictures.";

const text = (value) => (value == null ? "" : String(value));

const HTML_TAG = /<\/?[a-z][a-z0-9]*\b[^>]*>/i;
const PICTURE_TAG = /<img\b[^>]*\bdata-picture-id="(\d+)"[^>]*>/g;

const MAX_PICTURE_WIDTH = 600;

const pictureWidth = (value) =>
  /^\d+$/.test(text(value).trim()) ? Math.min(MAX_PICTURE_WIDTH, Number(value)) : 0;

const SANITIZE_OPTIONS = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "img"],
  allowedAttributes: { a: ["href"], img: ["data-picture-id", "alt", "width"], p: ["style"] },
  allowedStyles: { p: { "text-align": [/^center$/] } },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    img: (tagName, { width, ...attribs }) => {
      const pixels = pictureWidth(width);
      return { tagName, attribs: pixels ? { ...attribs, width: String(pixels) } : attribs };
    },
  },
  exclusiveFilter: (frame) =>
    frame.tag === "img" && !/^\d+$/.test(frame.attribs["data-picture-id"] || ""),
};

/** Bodies saved before HTML email have no tags and are read as plain text. */
export const isHtmlBody = (body) => HTML_TAG.test(text(body));

export const escapeHtml = (value) =>
  text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const decodeEntities = (value) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(39|x27);/g, "'")
    .replace(/&amp;/g, "&");

/** The body with only the allowed formatting, links, and library pictures; plain-text bodies unchanged. */
export const cleanEmailBody = (body) =>
  isHtmlBody(body) ? sanitizeHtml(text(body), SANITIZE_OPTIONS) : text(body);

/** True when the body has no text and no pictures. */
export const emailBodyIsBlank = (body) => {
  const value = text(body);
  if (!isHtmlBody(value)) return !value.trim();
  if (/<img\b/i.test(value)) return false;
  return !decodeEntities(value.replace(/<[^>]+>/g, "")).trim();
};

export const pictureIds = (body) =>
  isHtmlBody(body) ? [...new Set([...text(body).matchAll(PICTURE_TAG)].map((m) => Number(m[1])))] : [];

/** Why the body's pictures may not be saved or sent for this organization, or null. */
export const pictureRuleError = async (body, orgId) => {
  const ids = pictureIds(body);
  if (!ids.length) return null;
  if (orgId == null) return PICTURES_GLOBAL;
  const pictures = await db.emailPicture.findAll({ where: { id: ids } });
  if (pictures.length !== ids.length || pictures.some((p) => Number(p.orgId) !== Number(orgId))) {
    return PICTURES_FOREIGN;
  }
  const total = pictures.reduce((sum, picture) => sum + picture.sizeBytes, 0);
  return total > MAX_PICTURES_BYTES ? PICTURES_TOO_LARGE : null;
};

const htmlToText = (html, names) =>
  decodeEntities(
    html
      .replace(PICTURE_TAG, (_, id) => `[Picture: ${escapeHtml(names.get(Number(id)) ?? "picture")}]`)
      .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, inner) => {
        const label = inner.replace(/<[^>]+>/g, "");
        return label === href ? label : `${label} (${href})`;
      })
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "- ")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/(li|ul|ol)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const pictureExtension = (contentType) =>
  ({ "image/png": ".png", "image/gif": ".gif" })[contentType] ?? ".jpg";

export const pictureUrl = (picture) => `${PICTURE_URL_PREFIX}${picture.fileName}`;

const pictureCid = (picture) => `picture-${picture.id}@missiontrips.app`;

const readPicture = async (picture) => {
  try {
    return await fs.readFile(path.join(PICTURE_DIR, path.basename(picture.fileName)));
  } catch {
    return null;
  }
};

const pictureTag = (picture, src, width) => {
  const size = width
    ? `width="${width}" style="width:${width}px;max-width:100%;height:auto"`
    : `style="max-width:${MAX_PICTURE_WIDTH}px;height:auto"`;
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(picture.name)}" ${size}>`;
};

/**
 * The HTML and plain-text versions of a template body with tokens filled in. HTML token values are
 * escaped. Pictures come only from `orgId`'s library: `html` references them as inline attachments
 * (`pictures`), `previewHtml` by their library URL. `pictureError` names a missing picture.
 */
export const buildEmailContent = async (body, values, orgId) => {
  if (!isHtmlBody(body)) {
    const filled = substituteTokens(body, values);
    const html = escapeHtml(filled).replace(/\r?\n/g, "<br>");
    return { html, previewHtml: html, text: filled, pictures: [], pictureError: null };
  }

  const escapedValues = Object.fromEntries(
    Object.entries(values).map(([code, value]) => [code, escapeHtml(value)])
  );
  const filled = cleanEmailBody(substituteTokens(cleanEmailBody(body), escapedValues));
  const ids = pictureIds(filled);
  const rows = ids.length && orgId != null
    ? await db.emailPicture.findAll({ where: { id: ids, orgId } })
    : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const names = new Map(rows.map((row) => [row.id, row.name]));

  const pictures = [];
  let pictureError = null;
  for (const id of ids) {
    const picture = byId.get(id);
    const content = picture ? await readPicture(picture) : null;
    if (!content) {
      pictureError ??= picture ? `Picture ${picture.name} is missing.` : "A picture is missing.";
      continue;
    }
    pictures.push({
      filename: `${picture.name}${pictureExtension(picture.contentType)}`,
      content,
      contentType: picture.contentType,
      cid: pictureCid(picture),
      contentDisposition: "inline",
    });
  }

  const withPictures = (srcFor) =>
    filled.replace(PICTURE_TAG, (tag, id) => {
      const picture = byId.get(Number(id));
      const width = pictureWidth(/\swidth="(\d+)"/.exec(tag)?.[1]);
      return picture ? pictureTag(picture, srcFor(picture), width) : "";
    });

  return {
    html: withPictures((picture) => `cid:${pictureCid(picture)}`),
    previewHtml: withPictures(pictureUrl),
    text: htmlToText(filled, names),
    pictures: pictureError ? [] : pictures,
    pictureError,
  };
};
