import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";
import { STRIPE_DONATION_TYPES } from "./tripDonation.model.js";

const DonationCheckout = SequelizeInstance.define("donationCheckout", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  token: { type: Sequelize.STRING(64), allowNull: false, unique: true },
  tripId: { type: Sequelize.INTEGER, allowNull: false },
  personId: { type: Sequelize.INTEGER, allowNull: true },
  giverPersonId: { type: Sequelize.INTEGER, allowNull: true },
  donorFirstName: { type: Sequelize.STRING, allowNull: true },
  donorLastName: { type: Sequelize.STRING, allowNull: true },
  donorEmail: { type: Sequelize.STRING, allowNull: true },
  donorId: { type: Sequelize.INTEGER, allowNull: true },
  paymentInfo: { type: Sequelize.TEXT, allowNull: true },
  amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
  donationType: { type: Sequelize.ENUM(...STRIPE_DONATION_TYPES), allowNull: false },
  stripeTestMode: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  feeCoverageOffered: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  stripeCheckoutSessionId: { type: Sequelize.STRING(255), allowNull: true },
  stripeCheckoutUrl: { type: Sequelize.TEXT, allowNull: true },
  returnPath: { type: Sequelize.STRING(500), allowNull: true },
  status: {
    type: Sequelize.ENUM("pending", "completed", "expired"),
    allowNull: false,
    defaultValue: "pending",
  },
  tripDonationId: { type: Sequelize.INTEGER, allowNull: true },
});

export default DonationCheckout;
