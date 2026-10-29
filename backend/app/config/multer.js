import multer from "multer";
import fs from "fs";
import path from "path";
import { isHeicUpload } from "../utils/heicToJpeg.js";

const imageFilter = (_req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
  if (allowed.includes(file.mimetype) || isHeicUpload(file)) cb(null, true);
  else cb(new Error("Only PNG, JPEG, GIF, WebP, and HEIC images are allowed."), false);
};

const makeStorage = (dir, filenameFn) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: filenameFn,
  });

const imageExtension = (mimetype) => {
  if (mimetype === "image/png") return ".png";
  if (mimetype === "image/gif") return ".gif";
  if (mimetype === "image/webp") return ".webp";
  return ".jpg";
};

const documentFilter = (_req, file, cb) => {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/heic",
    "image/heif",
  ];
  const ext = path.extname(file.originalname || "").toLowerCase();
  const allowedExt = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".heif"];
  if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) cb(null, true);
  else cb(new Error("Only PDF, JPG, PNG, and HEIC files are allowed."), false);
};

const safeFilePart = (value) =>
  String(value || "document")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

export const uploadOrgLogo = multer({
  storage: makeStorage("images/logos", (req, file, cb) => {
    cb(null, `org-${req.params.id}-${Date.now()}${imageExtension(file.mimetype)}`);
  }),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

export const uploadPersonPicture = multer({
  storage: makeStorage("images/people", (req, file, cb) => {
    cb(null, `person-${req.params.id}-${Date.now()}${imageExtension(file.mimetype)}`);
  }),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

export const uploadTripImage = multer({
  storage: makeStorage("images/trips", (req, file, cb) => {
    cb(null, `trip-${req.params.id}-${Date.now()}${imageExtension(file.mimetype)}`);
  }),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

/** Kept in memory: the controller writes document files to `documents/people` only encrypted. */
export const uploadPersonDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const pdfFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (file.mimetype === "application/pdf" && ext === ".pdf") cb(null, true);
  else cb(new Error("Upload a PDF file."), false);
};

/** Kept in memory: the controller writes the file to `documents/trips` after access checks. */
export const uploadTripArrivalPdf = multer({
  storage: multer.memoryStorage(),
  fileFilter: pdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const csvFilter = (_req, file, cb) => {
  if (path.extname(file.originalname || "").toLowerCase() === ".csv") cb(null, true);
  else cb(new Error("Choose a CSV file up to 5 MB."), false);
};

/** Kept in memory: a Trip Master CSV is read once and not stored. */
export const uploadTripMasterCsv = multer({
  storage: multer.memoryStorage(),
  fileFilter: csvFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const emailPictureFilter = (_req, file, cb) => {
  if (["image/png", "image/jpeg", "image/gif"].includes(file.mimetype) || isHeicUpload(file)) cb(null, true);
  else cb(new Error("Upload a PNG, JPEG, GIF, or HEIC picture."), false);
};

/** Kept in memory: the controller writes the file to `images/email-pictures` after access checks. */
export const uploadEmailPicture = multer({
  storage: multer.memoryStorage(),
  fileFilter: emailPictureFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

/** Give each uploaded person document file the name it will have under `documents/people`. */
export const nameDocumentFiles = (req) => {
  for (const group of Object.values(req.files || {})) {
    for (const file of group) {
      const ext = path.extname(file.originalname || "");
      const base = safeFilePart(path.basename(file.originalname || "document", ext));
      file.filename = `person-${req.params.id}-${Date.now()}-${base}${ext}`;
    }
  }
};
