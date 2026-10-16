import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const WorkerRoleDocumentType = SequelizeInstance.define(
  "workerRoleDocumentType",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    workerRoleId: { type: Sequelize.INTEGER, allowNull: false },
    documentTypeId: { type: Sequelize.INTEGER, allowNull: false },
  },
  {
    indexes: [{ unique: true, fields: ["workerRoleId", "documentTypeId"] }],
  }
);

export default WorkerRoleDocumentType;
