import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const MedicalCondition = SequelizeInstance.define(
  "medicalCondition",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    orgId: { type: Sequelize.INTEGER, allowNull: false },
    name: { type: Sequelize.STRING(50), allowNull: false },
  },
  {
    indexes: [{ unique: true, fields: ["orgId", "name"] }],
  }
);

export default MedicalCondition;
