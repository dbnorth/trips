import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { Op } from "sequelize";
import db from "../models/index.js";
import { canAccessOrg, isOrgAdminForOrg } from "../authorization/accessControl.js";
import { PICTURE_DIR, pictureUrl } from "../utils/emailHtml.js";

const EmailPicture = db.emailPicture;
const EXTENSIONS = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif" };

const pictureJson = (picture) => ({
  id: picture.id,
  name: picture.name,
  url: pictureUrl(picture),
  contentType: picture.contentType,
  sizeBytes: picture.sizeBytes,
  createdAt: picture.createdAt,
});

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const orgId = Number(req.query.orgId);
    if (!orgId) return res.status(400).send({ message: "Organization is required." });
    if (!canAccessOrg(req, orgId)) return res.status(403).send({ message: "Forbidden." });
    const pictures = await EmailPicture.findAll({
      where: { orgId },
      order: [
        ["name", "ASC"],
        ["id", "ASC"],
      ],
    });
    res.send(pictures.map(pictureJson));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const orgId = Number(req.body.orgId);
    if (!orgId) return res.status(400).send({ message: "Organization is required." });
    if (!canAccessOrg(req, orgId)) return res.status(403).send({ message: "Forbidden." });
    if (!req.file) return res.status(400).send({ message: "Upload a PNG, JPEG, or GIF picture." });

    const fallbackName = path.parse(req.file.originalname || "").name;
    const name = String(req.body.name || fallbackName).trim().slice(0, 100);
    if (!name) return res.status(400).send({ message: "Name is required." });

    const fileName = `org-${orgId}-${crypto.randomBytes(16).toString("hex")}${EXTENSIONS[req.file.mimetype]}`;
    await fs.mkdir(PICTURE_DIR, { recursive: true });
    await fs.writeFile(path.join(PICTURE_DIR, fileName), req.file.buffer);
    const picture = await EmailPicture.create({
      orgId,
      name,
      fileName,
      contentType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
    res.send(pictureJson(picture));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const loadManagedPicture = async (req, res) => {
  const picture = await EmailPicture.findByPk(req.params.id);
  if (!picture) {
    res.status(404).send({ message: "Picture not found." });
    return null;
  }
  if (!isOrgAdminForOrg(req, picture.orgId)) {
    res.status(403).send({ message: "Forbidden." });
    return null;
  }
  return picture;
};

exports.update = async (req, res) => {
  try {
    const picture = await loadManagedPicture(req, res);
    if (!picture) return;
    const name = String(req.body?.name ?? "").trim().slice(0, 100);
    if (!name) return res.status(400).send({ message: "Name is required." });
    await picture.update({ name });
    res.send(pictureJson(picture));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const picture = await loadManagedPicture(req, res);
    if (!picture) return;
    const usedBy = await db.emailTemplate.count({
      where: {
        orgId: picture.orgId,
        emailBody: { [Op.like]: `%data-picture-id="${picture.id}"%` },
      },
    });
    if (usedBy) {
      return res.status(400).send({ message: `This picture is used by ${usedBy} templates.` });
    }
    await picture.destroy();
    await fs.rm(path.join(PICTURE_DIR, path.basename(picture.fileName)), { force: true });
    res.send({ message: "Picture deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
