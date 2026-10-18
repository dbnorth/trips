import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const DocumentTypeSpecialization = SequelizeInstance.define(
  "documentTypeSpecialization",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    documentTypeId: { type: Sequelize.INTEGER, allowNull: false },
    name: { type: Sequelize.STRING(100), allowNull: false },
  },
  {
    tableName: "documentTypeSpecializations",
    indexes: [
      {
        name: "documentTypeSpecializations_type_name_unique",
        unique: true,
        fields: ["documentTypeId", "name"],
      },
    ],
  }
);

export default DocumentTypeSpecialization;
