import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";
import { encryptedColumn } from "../utils/personalDataEncryption.js";

const Donor = SequelizeInstance.define("donor", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  firstName: { type: Sequelize.STRING, allowNull: true },
  lastName: { type: Sequelize.STRING },
  familyName: { type: Sequelize.STRING },
  organizationName: { type: Sequelize.STRING },
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
  donorType: { type: Sequelize.ENUM("organization", "individual"), allowNull: false, defaultValue: "individual" },
  personId: { type: Sequelize.INTEGER, allowNull: true },
  // orgId and its unique indexes are added by ensureSchema. Declaring the indexes here makes sync
  // index orgId before that column exists on a database created before Feature 130.
  orgId: { type: Sequelize.INTEGER, allowNull: false },
  version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
});

export default Donor;
