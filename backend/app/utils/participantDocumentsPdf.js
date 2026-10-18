import fs from "fs";
import path from "path";
import heicConvert from "heic-convert";
import { PDFDocument as PdfLibDocument } from "pdf-lib";
import db from "../models/index.js";
import { formatDate } from "./emailTokenValues.js";
import {
  orBlank,
  joinParts,
  organizationHeader,
  drawOrganizationHeader,
  drawInfoBlock,
  renderPdf,
} from "./pdf.js";

const DOCUMENTS_DIR = path.resolve("documents");
const NO_FILE = "No file uploaded.";
const UNREADABLE = "The file could not be read.";
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "heif"];

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code) => {
  if (!code) return "";
  try {
    return regionNames.of(String(code).toUpperCase()) || String(code);
  } catch {
    return String(code);
  }
};

const readDocumentFile = (fileName) => {
  const file = path.resolve(DOCUMENTS_DIR, fileName);
  if (!file.startsWith(DOCUMENTS_DIR + path.sep)) return null;
  try {
    return fs.readFileSync(file);
  } catch {
    return null;
  }
};

const isPdf = (data) => data.subarray(0, 4).toString("latin1") === "%PDF";
const isPng = (data) => data.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
const isJpeg = (data) => data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
const isHeic = (data) =>
  data.subarray(4, 8).toString("latin1") === "ftyp" &&
  HEIC_BRANDS.includes(data.subarray(8, 12).toString("latin1"));

/** The uploaded file as an image, a PDF to append, or a message. */
const loadUploadedFile = async (fileName) => {
  if (!fileName) return { kind: "message", message: NO_FILE };
  const data = readDocumentFile(fileName);
  if (!data) return { kind: "message", message: UNREADABLE };
  try {
    if (isPng(data) || isJpeg(data)) return { kind: "image", data };
    if (isHeic(data)) {
      const jpeg = await heicConvert({ buffer: data, format: "JPEG", quality: 0.9 });
      return { kind: "image", data: Buffer.from(jpeg) };
    }
    if (isPdf(data)) {
      const pdf = await PdfLibDocument.load(data);
      if (pdf.getPageCount() > 0) return { kind: "pdf", data };
    }
  } catch {
    // Damaged, password-protected, or unsupported files fall through to the message.
  }
  return { kind: "message", message: UNREADABLE };
};

/** Header, trip info, document details, and one page per document and specialization. */
export const buildParticipantDocumentsData = async (tripId, assignmentId) => {
  const trip = await db.trip.findByPk(tripId, {
    include: [{ model: db.organization, as: "organization", attributes: ["name", "logo"] }],
  });
  if (!trip) return null;
  const assignment = await db.tripPeopleRole.findOne({
    where: { id: assignmentId, tripId: trip.id },
    include: [
      { model: db.person, as: "person", attributes: ["id", "firstName", "middleName", "lastName"] },
    ],
  });
  const person = assignment?.person;
  if (!person) return null;

  const rows = await db.personDocument.findAll({
    where: { personId: person.id },
    include: [
      { model: db.documentType, as: "documentType", attributes: ["description", "hasExpirationDate"] },
      { model: db.personDocumentSpecialization, as: "specializations" },
    ],
    order: [
      [{ model: db.documentType, as: "documentType" }, "description", "ASC"],
      ["expirationDate", "ASC"],
      ["id", "ASC"],
      [{ model: db.personDocumentSpecialization, as: "specializations" }, "id", "ASC"],
    ],
  });

  const participantName = joinParts([person.firstName, person.middleName, person.lastName], " ");
  const documents = rows.map((row) => ({
    type: orBlank(row.documentType?.description),
    documentNumber: orBlank(row.documentNumber),
    countryIssued: orBlank(countryName(row.countryIssued)),
    issueDate: orBlank(formatDate(row.issueDate)),
    expirationDate: orBlank(
      row.documentType?.hasExpirationDate === false ? "" : formatDate(row.expirationDate)
    ),
    specializations: (row.specializations || []).map((spec) => ({
      name: orBlank(spec.name),
      date: orBlank(formatDate(spec.specializationDate)),
    })),
  }));

  const pages = [];
  for (const [index, row] of rows.entries()) {
    const document = documents[index];
    pages.push({
      title: document.type,
      details: [
        ["Type", document.type],
        ["Document number", document.documentNumber],
        ["Country issued", document.countryIssued],
        ["Issue date", document.issueDate],
        ["Expiration date", document.expirationDate],
      ],
      file: await loadUploadedFile(row.documentFileName),
    });
    for (const [specIndex, spec] of (row.specializations || []).entries()) {
      const specialization = document.specializations[specIndex];
      pages.push({
        title: specialization.name,
        details: [
          ["Document type", document.type],
          ["Specialization", specialization.name],
          ["Date", specialization.date],
        ],
        file: await loadUploadedFile(spec.documentFileName),
      });
    }
  }

  return {
    organization: organizationHeader(trip.organization),
    title: `Documents for ${participantName}`,
    participantName,
    fileName: `Documents - ${joinParts([person.firstName, person.lastName], " ")}.pdf`,
    trip: {
      name: orBlank(trip.name),
      location: orBlank(joinParts([trip.location, trip.city, trip.country], ", ")),
      dates: orBlank(joinParts([formatDate(trip.startDate), formatDate(trip.endDate)], " to ")),
    },
    documents,
    pages,
  };
};

const drawDocumentList = (doc, documents) => {
  doc.font("Helvetica-Bold").fontSize(12).text("Documents");
  doc.moveDown(0.3);
  if (!documents.length) {
    doc.font("Helvetica").fontSize(10).text("No documents.");
    return;
  }
  for (const document of documents) {
    doc.font("Helvetica-Bold").fontSize(11).text(document.type);
    for (const [label, value] of [
      ["Document number", document.documentNumber],
      ["Country issued", document.countryIssued],
      ["Issue date", document.issueDate],
      ["Expiration date", document.expirationDate],
    ]) {
      doc.font("Helvetica-Bold").fontSize(10).text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(value);
    }
    for (const spec of document.specializations) {
      doc.font("Helvetica-Bold").fontSize(10).text("Specialization: ", { continued: true });
      doc.font("Helvetica").text(`${spec.name}, ${spec.date}`);
    }
    doc.moveDown(0.5);
  }
};

const drawDocumentPage = (doc, participantName, page) => {
  doc.font("Helvetica-Bold").fontSize(16).text(participantName);
  doc.moveDown(0.3);
  drawInfoBlock(doc, page.title, page.details);
  if (page.file.kind === "message") {
    doc.font("Helvetica").fontSize(10).text(page.file.message);
    return;
  }
  if (page.file.kind !== "image") return;
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const height = doc.page.height - doc.page.margins.bottom - doc.y;
  try {
    doc.image(page.file.data, left, doc.y, { fit: [width, height], align: "center" });
  } catch {
    doc.font("Helvetica").fontSize(10).text(UNREADABLE);
  }
};

/** Render the documents PDF data and resolve with its bytes, with uploaded PDF pages appended. */
export const renderParticipantDocumentsPdf = async (data) => {
  const appended = [];
  const base = await renderPdf(
    (doc) => {
      let pageCount = 1;
      doc.on("pageAdded", () => {
        pageCount += 1;
      });
      drawOrganizationHeader(doc, data.organization);
      doc.font("Helvetica-Bold").fontSize(18).text(data.title);
      doc.moveDown(0.6);
      drawInfoBlock(doc, "Trip", [
        ["Trip", data.trip.name],
        ["Location", data.trip.location],
        ["Dates", data.trip.dates],
      ]);
      drawDocumentList(doc, data.documents);
      for (const page of data.pages) {
        doc.addPage();
        drawDocumentPage(doc, data.participantName, page);
        if (page.file.kind === "pdf") appended.push({ afterPage: pageCount - 1, data: page.file.data });
      }
    },
    { layout: "portrait" }
  );
  if (!appended.length) return base;

  const merged = await PdfLibDocument.load(base);
  let inserted = 0;
  for (const { afterPage, data: bytes } of appended) {
    const source = await PdfLibDocument.load(bytes);
    const copied = await merged.copyPages(source, source.getPageIndices());
    copied.forEach((page, index) => merged.insertPage(afterPage + inserted + 1 + index, page));
    inserted += copied.length;
  }
  return Buffer.from(await merged.save());
};
