import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const TripFlightSegment = SequelizeInstance.define("tripFlightSegment", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  tripFlightId: { type: Sequelize.INTEGER, allowNull: false },
  segmentNumber: { type: Sequelize.INTEGER, allowNull: false },
  departureAirportId: { type: Sequelize.INTEGER, allowNull: false },
  airlineId: { type: Sequelize.INTEGER, allowNull: false },
  flightNumber: { type: Sequelize.STRING(20), allowNull: false },
  departureDate: { type: Sequelize.DATEONLY, allowNull: false },
  departureTime: { type: Sequelize.STRING(5), allowNull: false },
  arrivalAirportId: { type: Sequelize.INTEGER, allowNull: false },
  arrivalDate: { type: Sequelize.DATEONLY, allowNull: false },
  arrivalTime: { type: Sequelize.STRING(5), allowNull: false },
  cabinClass: { type: Sequelize.STRING(50), allowNull: true },
  seatNumber: { type: Sequelize.STRING(20), allowNull: true },
});

export default TripFlightSegment;
