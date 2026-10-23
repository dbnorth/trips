import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const TripPeopleRoleExpense = SequelizeInstance.define("tripPeopleRoleExpense", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  tripPeopleRoleId: { type: Sequelize.INTEGER, allowNull: false },
  description: { type: Sequelize.STRING(255), allowNull: false },
  cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
});

export default TripPeopleRoleExpense;
