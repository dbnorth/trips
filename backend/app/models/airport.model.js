import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const Airport = SequelizeInstance.define("airport", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
  airportName: { type: Sequelize.STRING(255), allowNull: false },
  city: { type: Sequelize.STRING(255), allowNull: false },
  country: { type: Sequelize.STRING(100), allowNull: false },
});

export default Airport;
