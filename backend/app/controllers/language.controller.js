import db from "../models/index.js";

const Language = db.language;
const exports = {};

exports.findAll = async (_req, res) => {
  try {
    const data = await Language.findAll({
      attributes: ["id", "code", "name"],
      order: [["name", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
