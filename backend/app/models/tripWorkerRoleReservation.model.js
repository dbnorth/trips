import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const TripWorkerRoleReservation = SequelizeInstance.define(
  "tripWorkerRoleReservation",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    tripId: { type: Sequelize.INTEGER, allowNull: false },
    tripWorkerRoleId: { type: Sequelize.INTEGER, allowNull: false },
    email: { type: Sequelize.STRING(255), allowNull: false },
  },
  {
    indexes: [
      { name: "tripWorkerRoleReservations_trip_email_unique", unique: true, fields: ["tripId", "email"] },
    ],
  }
);

export default TripWorkerRoleReservation;
