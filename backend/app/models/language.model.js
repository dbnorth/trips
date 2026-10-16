import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const Language = SequelizeInstance.define("language", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
  name: { type: Sequelize.STRING(100), allowNull: false },
});

export default Language;
