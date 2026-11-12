import Sequelize from "sequelize";
import SequelizeInstance from "../config/sequelizeInstance.js";

const Organization = SequelizeInstance.define("organization", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: Sequelize.STRING(255), allowNull: false },
  accountNumber: { type: Sequelize.STRING(50), allowNull: true },
  addLine1: { type: Sequelize.STRING },
  addLine2: { type: Sequelize.STRING },
  city: { type: Sequelize.STRING },
  country: { type: Sequelize.STRING(2) },
  state_prov: { type: Sequelize.STRING },
  postalCode: { type: Sequelize.STRING },
  phoneContryCode: { type: Sequelize.STRING(10) },
  phoneNumber: { type: Sequelize.STRING(30) },
  email: { type: Sequelize.STRING },
  websiteUrl: { type: Sequelize.STRING(500) },
  facebookPage: { type: Sequelize.STRING(500) },
  instagram: { type: Sequelize.STRING(255) },
  logo: { type: Sequelize.STRING(500) },
  agreementFileName: { type: Sequelize.STRING(500) },
  medicalAgreementFileName: { type: Sequelize.STRING(500) },
  colorFamily: { type: Sequelize.STRING(50) },
  subdomain: { type: Sequelize.STRING(63), allowNull: true, unique: true },
  testMode: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  // Encrypted (`enc1:`) Stripe secret keys; never sent in responses.
  stripeSecretKey: { type: Sequelize.TEXT, allowNull: true },
  stripeTestSecretKey: { type: Sequelize.TEXT, allowNull: true },
  stripeFeeCoverage: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
});

const STRIPE_KEY_FLAGS = { stripeSecretKey: "stripeKeySaved", stripeTestSecretKey: "stripeTestKeySaved" };

Organization.prototype.toJSON = function toJSON() {
  const values = this.get({ plain: true });
  for (const [column, flag] of Object.entries(STRIPE_KEY_FLAGS)) {
    if (!Object.prototype.hasOwnProperty.call(values, column)) continue;
    values[flag] = !!values[column];
    delete values[column];
  }
  return values;
};

export default Organization;
