import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const IMAGES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../images");
const PDF_LOGO_EXTENSIONS = [".png", ".jpg", ".jpeg"];

/** Absolute path of the organization logo when it is a PNG or JPEG file that exists. */
const logoFilePath = (logo) => {
  if (!logo || !PDF_LOGO_EXTENSIONS.includes(path.extname(logo).toLowerCase())) return null;
  const file = path.join(IMAGES_DIR, logo);
  if (!file.startsWith(IMAGES_DIR + path.sep)) return null;
  return fs.existsSync(file) ? file : null;
};

const BLANK = "—";
export const orBlank = (value) => (value == null || String(value).trim() === "" ? BLANK : String(value));
export const joinParts = (parts, separator) =>
  parts.map((part) => (part == null ? "" : String(part).trim())).filter(Boolean).join(separator);

/** Organization header data: name and a logo file the PDF can draw (or null). */
export const organizationHeader = (organization) => ({
  name: orBlank(organization?.name),
  logoFile: logoFilePath(organization?.logo),
});

/** "15:45" → "3:45 PM"; values that are not HH:MM are returned as entered. */
const formatTime12 = (value) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || "").trim());
  if (!match) return String(value || "").trim();
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "2027-01-02" → "Saturday 01/02/2027". */
const formatWeekdayDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return "";
  const [, year, month, day] = match;
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay()];
  return `${weekday} ${month}/${day}/${year}`;
};

/** Flight date and time, e.g. "Saturday 01/02/2027 3:45 PM". */
export const formatFlightDateTime = (date, time) =>
  joinParts([formatWeekdayDate(date), formatTime12(time)], " ");

const LOGO_SIZE = 48;

export const drawOrganizationHeader = (doc, organization) => {
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  let nameX = left;
  if (organization.logoFile) {
    try {
      doc.image(organization.logoFile, left, top, { fit: [LOGO_SIZE, LOGO_SIZE], valign: "center" });
      nameX = left + LOGO_SIZE + 12;
    } catch {
      nameX = left;
    }
  }
  doc.font("Helvetica-Bold").fontSize(16);
  const nameHeight = doc.heightOfString(organization.name, { width: 500 });
  doc.text(organization.name, nameX, top + Math.max(0, (LOGO_SIZE - nameHeight) / 2), { width: 500 });
  doc.x = left;
  doc.y = top + LOGO_SIZE + 12;
};

export const drawInfoBlock = (doc, heading, lines) => {
  doc.font("Helvetica-Bold").fontSize(12).text(heading);
  doc.moveDown(0.2);
  for (const [label, value] of lines) {
    doc.font("Helvetica-Bold").fontSize(10).text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(value);
  }
  doc.moveDown(0.8);
};

const CELL_PADDING = 4;

export const rowHeight = (doc, columns, values) =>
  Math.max(
    ...columns.map((column, index) =>
      doc.heightOfString(values[index], { width: column.width - CELL_PADDING * 2 })
    )
  ) +
  CELL_PADDING * 2;

/** Draw one table row at y with a bottom line (lineColor null → no line); returns the next row's y. */
export const drawRow = (doc, columns, values, y, { bold = false, lineColor = "#999999" } = {}) => {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
  const height = rowHeight(doc, columns, values);
  let x = doc.page.margins.left;
  for (const [index, column] of columns.entries()) {
    doc.text(values[index], x + CELL_PADDING, y + CELL_PADDING, {
      width: column.width - CELL_PADDING * 2,
    });
    x += column.width;
  }
  if (lineColor) {
    doc
      .moveTo(doc.page.margins.left, y + height)
      .lineTo(x, y + height)
      .lineWidth(0.5)
      .strokeColor(lineColor)
      .stroke();
  }
  return y + height;
};

/** Run draw(doc) on a landscape letter document and resolve with the PDF bytes. */
export const renderPdf = (draw) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 36 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      draw(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });

export const sendPdf = (res, pdf, filename) => {
  const asciiFilename = filename.replace(/[^\x20-\x7e]|["\\]/g, "");
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });
  res.send(pdf);
};
