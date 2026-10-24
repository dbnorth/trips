import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const EmailPicture = SequelizeInstance.define("emailPicture", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  orgId: { type: Sequelize.INTEGER, allowNull: false },
  name: { type: Sequelize.STRING(100), allowNull: false },
  fileName: { type: Sequelize.STRING(255), allowNull: false },
  contentType: { type: Sequelize.STRING(50), allowNull: false },
  sizeBytes: { type: Sequelize.INTEGER, allowNull: false },
});

export default EmailPicture;
