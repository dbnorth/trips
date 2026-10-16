import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const TripRoomingList = SequelizeInstance.define("tripRoomingList", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  tripId: { type: Sequelize.INTEGER, allowNull: false, unique: true },
  hotelName: { type: Sequelize.STRING(255), allowNull: true },
  checkInDate: { type: Sequelize.DATEONLY, allowNull: true },
  notes: { type: Sequelize.TEXT, allowNull: true },
});

export default TripRoomingList;
