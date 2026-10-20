import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";
import { encryptedColumn } from "../utils/personalDataEncryption.js";

const PersonDocument = SequelizeInstance.define("personDocument", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  personId: { type: Sequelize.INTEGER, allowNull: false },
  documentTypeId: { type: Sequelize.INTEGER, allowNull: false },
  countryIssued: { type: Sequelize.STRING(2) },
  documentNumber: encryptedColumn("text"),
  issueDate: { type: Sequelize.DATEONLY },
  expirationDate: { type: Sequelize.DATEONLY, allowNull: true },
  documentFileName: { type: Sequelize.STRING(500), allowNull: true },
});

export default PersonDocument;
