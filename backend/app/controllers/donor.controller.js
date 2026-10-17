import db from "../models/index.js";
import { optimisticUpdate } from "../utils/optimisticUpdate.js";
import { normalizeEmail } from "../utils/userPerson.js";
import { donorDetailsFromPerson, findDonatablePerson } from "../utils/donorPerson.js";

const Donor = db.donor;
const fields = [
  "firstName",
  "lastName",
  "addLine1",
  "addLine2",
  "city",
  "country",
  "state_prov",
  "postalCode",
  "phoneContryCode",
  "phoneNumber",
  "email",
  "status",
];

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const data = await Donor.findAll({ order: [["lastName", "ASC"], ["firstName", "ASC"]] });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.lookupByEmail = async (req, res) => {
  try {
    const emailNorm = normalizeEmail(req.query.email);
    if (!emailNorm) return res.status(400).send({ message: "Email is required." });
    const donor = await Donor.findOne({
      where: db.sequelize.where(db.sequelize.fn("LOWER", db.sequelize.col("email")), emailNorm),
    });
    if (donor) return res.send({ ...donor.toJSON(), source: "donor" });

    const person = await findDonatablePerson(
      req,
      req.query.tripId,
      db.sequelize.where(db.sequelize.fn("LOWER", db.sequelize.col("email")), emailNorm)
    );
    if (!person) return res.status(404).send({ message: "Donor not found." });
    const linked = await Donor.findOne({ where: { personId: person.id } });
    if (linked) return res.send({ ...linked.toJSON(), source: "donor" });
    res.send({
      id: null,
      personId: person.id,
      ...donorDetailsFromPerson(person),
      status: "active",
      source: "person",
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { personId: _personId, ...payload } = req.body;
    if (payload.email) payload.email = normalizeEmail(payload.email);
    const data = await Donor.create(payload);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await optimisticUpdate(Donor, req.params.id, req.body, fields);
    if (!result.ok) return res.status(result.status).send({ message: result.message });
    res.send(result.data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
