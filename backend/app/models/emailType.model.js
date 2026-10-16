import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const EmailType = SequelizeInstance.define("emailType", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  typeCode: { type: Sequelize.STRING, allowNull: false, unique: true },
  description: { type: Sequelize.STRING, allowNull: false },
  eventCode: { type: Sequelize.STRING, allowNull: false },
});

export default EmailType;
