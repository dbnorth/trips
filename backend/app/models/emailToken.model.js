import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const EmailToken = SequelizeInstance.define("emailToken", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  tokenCode: { type: Sequelize.STRING(100), allowNull: false, unique: true },
  description: { type: Sequelize.STRING, allowNull: false },
  valueSource: { type: Sequelize.STRING(100), allowNull: false },
});

export default EmailToken;
