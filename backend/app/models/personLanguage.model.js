import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const PersonLanguage = SequelizeInstance.define(
  "personLanguage",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    personId: { type: Sequelize.INTEGER, allowNull: false },
    languageId: { type: Sequelize.INTEGER, allowNull: false },
    fluency: {
      type: Sequelize.ENUM("basic", "conversational"),
      allowNull: false,
    },
    knowsMedicalTerminology: { type: Sequelize.BOOLEAN, allowNull: false },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["personId", "languageId"],
      },
    ],
  }
);

export default PersonLanguage;
