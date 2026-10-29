import fs from "fs/promises";
import path from "path";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { encryptDocument, readDocumentFile, readDocumentKey } from "../utils/documentEncryption.js";
import { heicAsImage, withExtension } from "../utils/heicToJpeg.js";

const { Op, fn, col, where } = db.Sequelize;

const heicFileName = {
  [Op.or]: [".heic", ".heif"].map((ext) =>
    where(fn("LOWER", col("documentFileName")), { [Op.like]: `%${ext}` })
  ),
};

const convertRow = async (key, row) => {
  const oldPath = path.join("documents", row.documentFileName);
  try {
    const image = await heicAsImage(await readDocumentFile(oldPath));
    const documentFileName = withExtension(row.documentFileName, image.ext);
    await fs.writeFile(path.join("documents", documentFileName), encryptDocument(key, image.data));
    await row.update({ documentFileName });
    await fs.rm(oldPath, { force: true });
  } catch (err) {
    logger.warn(`Converting HEIC document file ${row.documentFileName} failed: ${err.message}`);
  }
};

/** Convert stored HEIC person document and specialization files to encrypted JPEG; failures are left for the next startup. */
export const convertHeicDocuments = async () => {
  try {
    const rows = [
      ...(await db.personDocument.findAll({ where: heicFileName })),
      ...(await db.personDocumentSpecialization.findAll({ where: heicFileName })),
    ];
    if (!rows.length) return;
    const key = await readDocumentKey();
    for (const row of rows) await convertRow(key, row);
  } catch (err) {
    logger.warn(`Converting HEIC document files failed: ${err.message}`);
  }
};
