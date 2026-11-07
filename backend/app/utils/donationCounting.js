import { Op } from "sequelize";

/** A donation counts toward totals when it is Check, Other (no payment status), or a Succeeded Stripe payment. */
export const countedDonations = (where = {}) => ({
  ...where,
  [Op.or]: [{ paymentStatus: null }, { paymentStatus: "succeeded" }],
});

export const donationCounts = (donation) =>
  donation.paymentStatus == null || donation.paymentStatus === "succeeded";
