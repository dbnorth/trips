import db from "../models/index.js";
import { orBlank, organizationHeader, drawOrganizationHeader, rowHeight, drawRow, renderPdf } from "./pdf.js";

const FUNCTION_CODE_ORDER = ["Scheduled", "Send Now", "Trip Participant", "Person", "Donor"];
const NO_FUNCTION_CODE = "No function code";
const ALL_TRIPS = "All trips";

const scheduleText = (template) => {
  if (template.scheduleRule === "daily") return "Daily";
  if (template.scheduleRule === "weekly") return "Weekly (Tuesday)";
  if (template.scheduleRule === "monthly" && template.scheduleDayOfMonth) {
    return `Monthly (day ${Number(template.scheduleDayOfMonth)})`;
  }
  if (template.scheduleRule === "twice-monthly") return "Twice monthly (1st and 15th)";
  if (template.scheduleRule === "before-start" && template.scheduleDaysBefore) {
    const days = Number(template.scheduleDaysBefore);
    return `${days} ${days === 1 ? "day" : "days"} before trip start`;
  }
  return orBlank(null);
};

const whenSent = (template) => {
  if (template.functionCode === "Scheduled") return scheduleText(template);
  if (template.functionCode === "Send Now") return "On Event";
  if (template.functionCode === "Trip Participant" || template.functionCode === "Person" || template.functionCode === "Donor") {
    return "Manual";
  }
  return orBlank(null);
};

const eventDescription = (emailType) => {
  if (!emailType) return orBlank(null);
  return String(emailType.eventDescription || "").trim() || "No event description.";
};

const templateRow = (template) => ({
  subject: orBlank(template.subject),
  emailType: orBlank(template.emailType?.description),
  whenSent: whenSent(template),
  trip: template.tripId == null ? ALL_TRIPS : orBlank(template.trip?.name),
  eventDescription: eventDescription(template.emailType),
});

const compareRows = (a, b) =>
  a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" }) ||
  (a.trip === ALL_TRIPS ? -1 : 0) - (b.trip === ALL_TRIPS ? -1 : 0) ||
  a.trip.localeCompare(b.trip, undefined, { sensitivity: "base" });

/** Organization header and the organization's templates grouped by function code (null when the organization is missing). */
export const buildEmailReportData = async (orgId) => {
  const organization = await db.organization.findByPk(orgId, { attributes: ["id", "name", "logo"] });
  if (!organization) return null;

  const templates = await db.emailTemplate.findAll({
    where: { orgId },
    include: [
      { model: db.trip, as: "trip", attributes: ["id", "name"] },
      { model: db.emailType, attributes: ["id", "description", "eventDescription"] },
    ],
  });

  const groups = new Map();
  for (const template of templates) {
    const name = FUNCTION_CODE_ORDER.includes(template.functionCode) ? template.functionCode : NO_FUNCTION_CODE;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(templateRow(template));
  }

  return {
    organization: organizationHeader(organization),
    groups: [...FUNCTION_CODE_ORDER, NO_FUNCTION_CODE]
      .filter((name) => groups.has(name))
      .map((name) => ({ functionCode: name, rows: groups.get(name).sort(compareRows) })),
  };
};

const COLUMNS = [
  { key: "subject", label: "Subject", width: 150 },
  { key: "emailType", label: "Email type", width: 110 },
  { key: "whenSent", label: "When sent", width: 95 },
  { key: "trip", label: "Trip", width: 95 },
  { key: "eventDescription", label: "Event description", width: 270 },
];
const GROUP_HEADING_HEIGHT = 40;

/** Render the email report data as a PDF and resolve with its bytes. */
export const renderEmailReportPdf = (data) =>
  renderPdf((doc) => {
    drawOrganizationHeader(doc, data.organization);
    doc.font("Helvetica-Bold").fontSize(18).text("Email Report");
    doc.moveDown(0.6);

    if (!data.groups.length) {
      doc.font("Helvetica").fontSize(10).text("No email templates.");
      return;
    }

    const headerValues = COLUMNS.map((column) => column.label);
    const bottom = doc.page.height - doc.page.margins.bottom;
    const drawHeader = (y) => drawRow(doc, COLUMNS, headerValues, y, { bold: true, lineColor: "#555555" });

    for (const group of data.groups) {
      doc.font("Helvetica").fontSize(9);
      const firstValues = COLUMNS.map((column) => group.rows[0][column.key]);
      if (doc.y + GROUP_HEADING_HEIGHT + rowHeight(doc, COLUMNS, firstValues) > bottom) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(12).text(group.functionCode, doc.page.margins.left, doc.y);
      doc.moveDown(0.2);

      let y = drawHeader(doc.y);
      for (const row of group.rows) {
        const values = COLUMNS.map((column) => row[column.key]);
        doc.font("Helvetica").fontSize(9);
        if (y + rowHeight(doc, COLUMNS, values) > bottom) {
          doc.addPage();
          y = drawHeader(doc.page.margins.top);
        }
        y = drawRow(doc, COLUMNS, values, y, { lineColor: "#dddddd" });
      }
      doc.x = doc.page.margins.left;
      doc.y = y;
      doc.moveDown(1);
    }
  });
