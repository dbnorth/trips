import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const DocumentType = SequelizeInstance.define("documentType", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  description: { type: Sequelize.STRING(255), allowNull: false },
    type: {
      type: Sequelize.ENUM("medical_licence", "passport", "certification", "diploma"),
      allowNull: false,
    },
  documentNumberRequired: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  instructions: { type: Sequelize.TEXT, allowNull: true },
  allowSpecialization: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  hasExpirationDate: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

export default DocumentType;
