import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

export const DONATION_TYPES = ["Stripe-ACH", "Stripe-Credit", "Check", "Other"];
export const STRIPE_DONATION_TYPES = ["Stripe-ACH", "Stripe-Credit"];
export const PAYMENT_STATUSES = ["processing", "succeeded", "failed"];

const TripDonation = SequelizeInstance.define(
  "tripDonation",
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    tripId: { type: Sequelize.INTEGER, allowNull: false },
    personId: { type: Sequelize.INTEGER, allowNull: true },
    donorId: { type: Sequelize.INTEGER, allowNull: true },
    amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
    dateTime: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    paymentInfo: { type: Sequelize.TEXT },
    donationType: { type: Sequelize.ENUM(...DONATION_TYPES), allowNull: false, defaultValue: "Other" },
    checkNumber: { type: Sequelize.STRING(50), allowNull: true },
    processingFeeAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
    paymentStatus: { type: Sequelize.ENUM(...PAYMENT_STATUSES), allowNull: true },
    paymentStatusUpdatedAt: { type: Sequelize.DATE, allowNull: true },
    stripeFailureMessage: { type: Sequelize.STRING(500), allowNull: true },
    stripePaymentMethodType: { type: Sequelize.STRING(50), allowNull: true },
    stripePaymentMethodBrand: { type: Sequelize.STRING(100), allowNull: true },
    stripePaymentMethodLast4: { type: Sequelize.STRING(4), allowNull: true },
    stripeCheckoutSessionId: { type: Sequelize.STRING(255), allowNull: true },
    // Column-level unique (not `indexes`): sync on an existing table would index the column before ensureSchema adds it.
    stripePaymentIntentId: {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: "tripDonations_stripePaymentIntentId_unique",
    },
    stripeChargeId: { type: Sequelize.STRING(255), allowNull: true },
    stripeReceiptUrl: { type: Sequelize.STRING(500), allowNull: true },
    stripeData: { type: Sequelize.TEXT, allowNull: true },
    version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
  }
);

export default TripDonation;
