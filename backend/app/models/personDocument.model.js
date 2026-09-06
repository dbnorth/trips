import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const PersonDocument = SequelizeInstance.define("personDocument", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  personId: { type: Sequelize.INTEGER, allowNull: false },
  documentTypeId: { type: Sequelize.INTEGER, allowNull: false },
  countryIssued: { type: Sequelize.STRING(2) },
  documentNumber: { type: Sequelize.STRING(100), allowNull: true },
  issueDate: { type: Sequelize.DATEONLY },
  expirationDate: { type: Sequelize.DATEONLY, allowNull: false },
  documentFileName: { type: Sequelize.STRING(500), allowNull: true },
});

export default PersonDocument;
