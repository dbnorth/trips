import fs from "fs/promises";
import path from "path";
import db from "../models/index.js";

const ARRIVAL_PDF_DIR = path.resolve("documents", "trips");

/** File name the Trip Arrival PDF is shown and sent as. */
export const arrivalPdfName = (trip) => `Trip Arrival - ${trip.name}.pdf`;

const storedPath = (fileName) => {
  const file = path.resolve(ARRIVAL_PDF_DIR, fileName);
  return file.startsWith(ARRIVAL_PDF_DIR + path.sep) ? file : null;
};

/** The trip with its stored arrival PDF file name (hidden by the trip's default scope). */
export const loadTripWithArrivalPdf = (tripId) => db.trip.unscoped().findByPk(tripId);

/** Write a new arrival PDF for the trip and return its stored file name. */
export const writeArrivalPdf = async (tripId, buffer) => {
  await fs.mkdir(ARRIVAL_PDF_DIR, { recursive: true });
  const fileName = `trip-${tripId}-arrival-${Date.now()}.pdf`;
  await fs.writeFile(path.join(ARRIVAL_PDF_DIR, fileName), buffer);
  return fileName;
};

export const deleteArrivalPdf = async (fileName) => {
  const file = fileName ? storedPath(fileName) : null;
  if (file) await fs.rm(file, { force: true });
};

/** The trip's arrival PDF contents, or null when it has none or the file cannot be read. */
export const readArrivalPdf = async (trip) => {
  const file = trip?.arrivalPdfFileName ? storedPath(trip.arrivalPdfFileName) : null;
  if (!file) return null;
  try {
    return await fs.readFile(file);
  } catch {
    return null;
  }
};
