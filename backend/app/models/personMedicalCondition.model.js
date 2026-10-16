import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const PersonMedicalCondition = SequelizeInstance.define(
  "personMedicalCondition",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    personId: { type: Sequelize.INTEGER, allowNull: false },
    medicalConditionId: { type: Sequelize.INTEGER, allowNull: false },
  },
  {
    indexes: [{ unique: true, fields: ["personId", "medicalConditionId"] }],
  }
);

export default PersonMedicalCondition;
