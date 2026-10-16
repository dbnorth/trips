import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const EmailTemplate = SequelizeInstance.define("emailTemplate", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  orgId: { type: Sequelize.INTEGER, allowNull: true },
  tripId: { type: Sequelize.INTEGER, allowNull: true },
  fromEmail: { type: Sequelize.STRING },
  functionCode: { type: Sequelize.STRING },
  subject: { type: Sequelize.STRING(500) },
  content: { type: Sequelize.TEXT },
  attachment: { type: Sequelize.STRING(500) },
  emailTypeId: { type: Sequelize.INTEGER, allowNull: true },
  emailBody: { type: Sequelize.TEXT, allowNull: true },
  toAddress: { type: Sequelize.STRING(1000), allowNull: true },
});

export default EmailTemplate;
