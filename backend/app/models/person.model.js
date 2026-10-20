import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";
import { encryptedColumn } from "../utils/personalDataEncryption.js";

const Person = SequelizeInstance.define(
  "person",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: Sequelize.INTEGER, allowNull: true },
    firstName: { type: Sequelize.STRING, allowNull: false },
    middleName: { type: Sequelize.STRING, allowNull: true },
    lastName: { type: Sequelize.STRING, allowNull: false },
    preferredName: { type: Sequelize.STRING, allowNull: true },
    email: { type: Sequelize.STRING },
    addLine1: encryptedColumn("text"),
    addLine2: encryptedColumn("text"),
    city: encryptedColumn("text"),
    country: { type: Sequelize.STRING(2) },
    state_prov: encryptedColumn("text"),
    postalCode: encryptedColumn("text"),
    phoneContryCode: { type: Sequelize.STRING(10) },
    phoneNumber: encryptedColumn("text"),
    birthDate: encryptedColumn("date"),
    gender: { type: Sequelize.ENUM("male", "female") },
    emergencyContactName: encryptedColumn("text"),
    emergencyContactPhoneCountryCode: { type: Sequelize.STRING(10) },
    emergencyContactPhoneNumber: encryptedColumn("text"),
    emergencyContactRelationship: {
      type: Sequelize.ENUM(
        "spouse",
        "father",
        "mother",
        "child",
        "grandmother",
        "grandfather",
        "other"
      ),
      allowNull: true,
      defaultValue: null,
    },
    hasAllergies: encryptedColumn("yesNo"),
    allergiesDescription: encryptedColumn("text"),
    takesMedication: encryptedColumn("yesNo"),
    medicalConditionIds: encryptedColumn("idList"),
    speaksOtherLanguage: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: null },
    currentChurchHome: { type: Sequelize.STRING(255) },
    currentChurchHomeCity: { type: Sequelize.STRING(100) },
    currentChurchHomeStateProv: { type: Sequelize.STRING(100) },
    picture: { type: Sequelize.STRING(500) },
    bioText: { type: Sequelize.TEXT },
    version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    // Holds IDs from every organization; read through utils/personMedicalConditions.js.
    defaultScope: { attributes: { exclude: ["medicalConditionIds"] } },
  }
);

export default Person;
