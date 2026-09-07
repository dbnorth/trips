import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const Airline = SequelizeInstance.define("airline", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
  name: { type: Sequelize.STRING(255), allowNull: false },
});

export default Airline;
