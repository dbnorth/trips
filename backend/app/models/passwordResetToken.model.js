import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const PasswordResetToken = SequelizeInstance.define("passwordResetToken", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: Sequelize.INTEGER, allowNull: false },
  tokenHash: { type: Sequelize.CHAR(64), allowNull: false, unique: "passwordResetTokens_tokenHash_unique" },
  expiresAt: { type: Sequelize.DATE, allowNull: false },
  usedAt: { type: Sequelize.DATE, allowNull: true },
});

export default PasswordResetToken;
