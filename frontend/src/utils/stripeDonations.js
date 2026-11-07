export const ONLINE_DONATIONS_NOT_SET_UP = "Online donations aren't set up for this organization yet.";

export const PAYMENT_STATUS_LABELS = { processing: "Processing", succeeded: "Succeeded", failed: "Failed" };

export const STRIPE_DONATION_TYPES = ["Stripe-ACH", "Stripe-Credit"];

export const isStripeDonationType = (type) => STRIPE_DONATION_TYPES.includes(type);

/** Send the browser to the Stripe Checkout page. */
export const goToStripe = (url) => {
  window.location.assign(url);
};

/** "Visa •••• 4242" for a card, "<Bank> •••• 6789" for a bank account, or "—" when Stripe hasn't reported it. */
export const paymentMethodText = (donation) => {
  const brand = donation?.stripePaymentMethodBrand;
  const last4 = donation?.stripePaymentMethodLast4;
  if (!brand || !last4) return "—";
  const name = donation.stripePaymentMethodType === "card" ? brand.charAt(0).toUpperCase() + brand.slice(1) : brand;
  return `${name} •••• ${last4}`;
};

/** **Type** column text: the type, with the check number for a Check. */
export const donationTypeText = (donation) =>
  donation?.donationType === "Check" && donation.checkNumber
    ? `Check #${donation.checkNumber}`
    : donation?.donationType || "Other";

export const paymentStatusText = (donation) => PAYMENT_STATUS_LABELS[donation?.paymentStatus] || "—";

/** Check, Other, and Succeeded donations count toward totals. */
export const donationCounts = (donation) => donation.paymentStatus == null || donation.paymentStatus === "succeeded";
