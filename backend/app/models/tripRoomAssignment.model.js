import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const TripRoomAssignment = SequelizeInstance.define("tripRoomAssignment", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  tripRoomId: { type: Sequelize.INTEGER, allowNull: false },
  tripPeopleRoleId: { type: Sequelize.INTEGER, allowNull: false, unique: true },
});

export default TripRoomAssignment;
