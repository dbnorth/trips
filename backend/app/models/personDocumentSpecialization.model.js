import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const PersonDocumentSpecialization = SequelizeInstance.define(
  "personDocumentSpecialization",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    personDocumentId: { type: Sequelize.INTEGER, allowNull: false },
    name: { type: Sequelize.STRING, allowNull: false },
    specializationDate: { type: Sequelize.DATEONLY, allowNull: false },
    documentFileName: { type: Sequelize.STRING(500), allowNull: false },
  },
  { tableName: "personDocumentSpecializations" }
);

export default PersonDocumentSpecialization;
