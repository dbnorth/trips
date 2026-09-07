import db from "../models/index.js";
import { isSystemAdmin } from "../authorization/accessControl.js";

const Airline = db.airline;
const TripFlightSegment = db.tripFlightSegment;
const Op = db.Sequelize.Op;

const exports = {};

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

exports.findAll = async (req, res) => {
  try {
    const data = await Airline.findAll({ order: [["code", "ASC"]] });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (!isSystemAdmin(req)) return res.status(403).send({ message: "Forbidden." });
    const code = normalizeCode(req.body.code);
    const name = String(req.body.name || "").trim();
    if (!code || !name) {
      return res.status(400).send({ message: "Airline code and name are required." });
    }
    const existing = await Airline.findOne({ where: { code } });
    if (existing) return res.status(400).send({ message: "Airline code already exists." });
    const row = await Airline.create({ code, name });
    res.send(row);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    if (!isSystemAdmin(req)) return res.status(403).send({ message: "Forbidden." });
    const row = await Airline.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Airline not found." });
    const code = Object.prototype.hasOwnProperty.call(req.body, "code")
      ? normalizeCode(req.body.code)
      : row.code;
    const name = Object.prototype.hasOwnProperty.call(req.body, "name")
      ? String(req.body.name || "").trim()
      : row.name;
    if (!code || !name) {
      return res.status(400).send({ message: "Airline code and name are required." });
    }
    const clash = await Airline.findOne({
      where: { code, id: { [Op.ne]: row.id } },
    });
    if (clash) return res.status(400).send({ message: "Airline code already exists." });
    await row.update({ code, name });
    res.send(row);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    if (!isSystemAdmin(req)) return res.status(403).send({ message: "Forbidden." });
    const row = await Airline.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Airline not found." });
    const inUse = await TripFlightSegment.count({ where: { airlineId: row.id } });
    if (inUse > 0) {
      return res.status(409).send({ message: "Airline is referenced by flight segments." });
    }
    await row.destroy();
    res.send({ message: "Airline deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
