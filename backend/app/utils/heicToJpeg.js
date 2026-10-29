import fs from "fs/promises";
import path from "path";
import heicConvert from "heic-convert";

export const HEIC_DOCUMENT_UNREADABLE =
  "This HEIC photo couldn't be read. Upload it as a JPG, PNG, or PDF instead.";
export const HEIC_PICTURE_UNREADABLE =
  "This HEIC photo couldn't be read. Upload it as a JPG or PNG instead.";

const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "heif"];
const HEIC_NAME = /\.(heic|heif)$/i;
const HEIC_TYPE = /^image\/hei[cf]$/i;

export const isHeic = (data) =>
  data.length >= 12 &&
  data.subarray(4, 8).toString("latin1") === "ftyp" &&
  HEIC_BRANDS.includes(data.subarray(8, 12).toString("latin1"));
const isJpeg = (data) => data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
const isPng = (data) => data.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

/** Whether an upload's name or type says HEIC/HEIF. */
export const isHeicUpload = (file) =>
  HEIC_NAME.test(file.originalname || "") || HEIC_TYPE.test(file.mimetype || "");

/**
 * HEIC data as JPEG. Data that is already JPEG or PNG (a HEIC name on another image) is kept.
 * Throws when the data can't be read as an image.
 */
export const heicAsImage = async (data) => {
  if (isHeic(data)) {
    const jpeg = await heicConvert({ buffer: data, format: "JPEG", quality: 0.9 });
    return { data: Buffer.from(jpeg), ext: ".jpg", mimetype: "image/jpeg" };
  }
  if (isJpeg(data)) return { data, ext: ".jpg", mimetype: "image/jpeg" };
  if (isPng(data)) return { data, ext: ".png", mimetype: "image/png" };
  throw new Error("Not a HEIC image.");
};

export const withExtension = (name, ext) => name.slice(0, name.length - path.extname(name).length) + ext;

const applyImage = (file, image) => {
  file.mimetype = image.mimetype;
  file.size = image.data.length;
};

/** Convert an in-memory HEIC upload to JPEG; returns false when it can't be read. */
export const convertHeicUpload = async (file) => {
  if (!isHeicUpload(file) && !isHeic(file.buffer)) return true;
  try {
    const image = await heicAsImage(file.buffer);
    applyImage(file, image);
    file.buffer = image.data;
    if (file.filename) file.filename = withExtension(file.filename, image.ext);
    return true;
  } catch {
    return false;
  }
};

/** Convert a HEIC upload multer wrote to disk to JPEG; an unreadable file is removed and false returned. */
export const convertHeicUploadOnDisk = async (file) => {
  const data = await fs.readFile(file.path);
  if (!isHeicUpload(file) && !isHeic(data)) return true;
  let image;
  try {
    image = await heicAsImage(data);
  } catch {
    await fs.rm(file.path, { force: true });
    return false;
  }
  const newPath = withExtension(file.path, image.ext);
  await fs.writeFile(newPath, image.data);
  if (newPath !== file.path) await fs.rm(file.path, { force: true });
  applyImage(file, image);
  file.path = newPath;
  file.filename = path.basename(newPath);
  return true;
};

/** Route step after a picture upload (in memory or on disk): converts HEIC, or refuses it with 400. */
export const convertUploadedPicture = async (req, res, next) => {
  try {
    if (!req.file) return next();
    const converted = req.file.buffer
      ? await convertHeicUpload(req.file)
      : await convertHeicUploadOnDisk(req.file);
    if (!converted) return res.status(400).send({ message: HEIC_PICTURE_UNREADABLE });
    return next();
  } catch (err) {
    return next(err);
  }
};
