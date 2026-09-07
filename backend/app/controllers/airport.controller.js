import db from "../models/index.js";
import { isSystemAdmin } from "../authorization/accessControl.js";

const Airport = db.airport;
const TripFlightSegment = db.tripFlightSegment;
const Op = db.Sequelize.Op;

const exports = {};

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

exports.findAll = async (req, res) => {
  try {
    const data = await Airport.findAll({ order: [["code", "ASC"]] });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (!isSystemAdmin(req)) return res.status(403).send({ message: "Forbidden." });
    const code = normalizeCode(req.body.code);
    const airportName = String(req.body.airportName || "").trim();
    const city = String(req.body.city || "").trim();
    const country = String(req.body.country || "").trim();
    if (!code || !airportName || !city || !country) {
      return res.status(400).send({ message: "Code, airport name, city, and country are required." });
    }
    const existing = await Airport.findOne({ where: { code } });
    if (existing) return res.status(400).send({ message: "Airport code already exists." });
    const row = await Airport.create({ code, airportName, city, country });
    res.send(row);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    if (!isSystemAdmin(req)) return res.status(403).send({ message: "Forbidden." });
    const row = await Airport.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Airport not found." });
    const code = Object.prototype.hasOwnProperty.call(req.body, "code")
      ? normalizeCode(req.body.code)
      : row.code;
    const airportName = Object.prototype.hasOwnProperty.call(req.body, "airportName")
      ? String(req.body.airportName || "").trim()
      : row.airportName;
    const city = Object.prototype.hasOwnProperty.call(req.body, "city")
      ? String(req.body.city || "").trim()
      : row.city;
    const country = Object.prototype.hasOwnProperty.call(req.body, "country")
      ? String(req.body.country || "").trim()
      : row.country;
    if (!code || !airportName || !city || !country) {
      return res.status(400).send({ message: "Code, airport name, city, and country are required." });
    }
    const clash = await Airport.findOne({
      where: { code, id: { [Op.ne]: row.id } },
    });
    if (clash) return res.status(400).send({ message: "Airport code already exists." });
    await row.update({ code, airportName, city, country });
    res.send(row);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    if (!isSystemAdmin(req)) return res.status(403).send({ message: "Forbidden." });
    const row = await Airport.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Airport not found." });
    const inUse = await TripFlightSegment.count({
      where: {
        [Op.or]: [{ departureAirportId: row.id }, { arrivalAirportId: row.id }],
      },
    });
    if (inUse > 0) {
      return res.status(409).send({ message: "Airport is referenced by flight segments." });
    }
    await row.destroy();
    res.send({ message: "Airport deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
