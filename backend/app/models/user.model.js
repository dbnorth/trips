import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const User = SequelizeInstance.define(
  "user",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: Sequelize.STRING, allowNull: false, unique: "users_email_unique" },
    password: { type: Sequelize.STRING(255), allowNull: false },
    isAdmin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    passwordSetByUser: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    failedLoginCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    lockedUntil: { type: Sequelize.DATE, allowNull: true },
  },
  {
    defaultScope: { attributes: { exclude: ["password", "failedLoginCount", "lockedUntil"] } },
    indexes: [{ name: "users_email_unique", unique: true, fields: ["email"] }],
  }
);

export default User;
