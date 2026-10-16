import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const ScheduledEmailSend = SequelizeInstance.define(
  "scheduledEmailSend",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    emailTemplateId: { type: Sequelize.INTEGER, allowNull: false },
    tripId: { type: Sequelize.INTEGER, allowNull: false },
    personId: { type: Sequelize.INTEGER, allowNull: false },
    sendDate: { type: Sequelize.DATEONLY, allowNull: false },
    status: { type: Sequelize.ENUM("sent", "skipped", "failed"), allowNull: false },
    reason: { type: Sequelize.STRING(1000), allowNull: true },
    emailLogId: { type: Sequelize.INTEGER, allowNull: true },
  },
  {
    indexes: [
      {
        unique: true,
        name: "scheduledEmailSends_template_trip_person_date_unique",
        fields: ["emailTemplateId", "tripId", "personId", "sendDate"],
      },
    ],
  }
);

export default ScheduledEmailSend;
