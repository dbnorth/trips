import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";
import { encryptedColumn } from "../utils/personalDataEncryption.js";

const Donor = SequelizeInstance.define("donor", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  firstName: { type: Sequelize.STRING, allowNull: false },
  lastName: { type: Sequelize.STRING },
  addLine1: encryptedColumn("text"),
  addLine2: encryptedColumn("text"),
  city: encryptedColumn("text"),
  country: { type: Sequelize.STRING(2) },
  state_prov: encryptedColumn("text"),
  postalCode: encryptedColumn("text"),
  phoneContryCode: { type: Sequelize.STRING(10) },
  phoneNumber: encryptedColumn("text"),
  email: { type: Sequelize.STRING },
  status: { type: Sequelize.ENUM("active", "inactive", "dontcontact"), allowNull: false, defaultValue: "active" },
  personId: { type: Sequelize.INTEGER, allowNull: true, unique: "donors_personId_unique" },
  version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
});

export default Donor;
