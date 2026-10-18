import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const WorkerRoleSpecialization = SequelizeInstance.define(
  "workerRoleSpecialization",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    workerRoleId: { type: Sequelize.INTEGER, allowNull: false },
    documentTypeSpecializationId: { type: Sequelize.INTEGER, allowNull: false },
  },
  {
    tableName: "workerRoleSpecializations",
  }
);

export default WorkerRoleSpecialization;
