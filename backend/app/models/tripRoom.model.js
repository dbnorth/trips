import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

export const TRIP_ROOM_TYPES = ["King", "Double", "Triple"];

const TripRoom = SequelizeInstance.define("tripRoom", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  tripRoomingListId: { type: Sequelize.INTEGER, allowNull: false },
  roomNumber: { type: Sequelize.STRING(50), allowNull: false },
  roomType: {
    type: Sequelize.STRING(20),
    allowNull: false,
    validate: { isIn: [TRIP_ROOM_TYPES] },
  },
  numberOfNights: { type: Sequelize.INTEGER, allowNull: false },
});

export default TripRoom;
