import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const TripFlight = SequelizeInstance.define("tripFlight", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  tripPeopleRoleId: { type: Sequelize.INTEGER, allowNull: false, unique: true },
  purchased: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
  comments: { type: Sequelize.TEXT, allowNull: true },
});

export default TripFlight;
