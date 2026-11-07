const STRIPE_API_URL = "https://api.stripe.com/v1";
export const STRIPE_API_VERSION = "2025-09-30.clover";
/** Stripe fee coverage is a private preview; only its sessions use this version. */
export const STRIPE_FEE_COVERAGE_API_VERSION = "2026-08-26.preview";

export class StripeRequestError extends Error {}

/** Stripe's form encoding: nested objects as `a[b][c]`, arrays as `a[0]`. */
export const encodeStripeParams = (params, prefix = "") => {
  const pairs = [];
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") {
      pairs.push(encodeStripeParams(value, name));
    } else {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return pairs.filter(Boolean).join("&");
};

/** Tests replace `request` so Stripe is never called. */
export const stripeClient = {
  async request({ method, path, key, params = {}, idempotencyKey = null, apiVersion = STRIPE_API_VERSION }) {
    const encoded = encodeStripeParams(params);
    const headers = {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": apiVersion,
    };
    let url = `${STRIPE_API_URL}${path}`;
    let body;
    if (method === "GET") {
      if (encoded) url += `?${encoded}`;
    } else {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
      body = encoded;
    }
    const response = await fetch(url, { method, headers, body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new StripeRequestError(data?.error?.message || `Stripe answered ${response.status}.`);
    }
    return data;
  },
};

export const createCheckoutSession = (key, params, idempotencyKey, apiVersion) =>
  stripeClient.request({ method: "POST", path: "/checkout/sessions", key, params, idempotencyKey, apiVersion });

export const retrieveCheckoutSession = (key, sessionId, apiVersion) =>
  stripeClient.request({
    method: "GET",
    path: `/checkout/sessions/${encodeURIComponent(sessionId)}`,
    key,
    params: { expand: ["payment_intent.latest_charge"] },
    apiVersion,
  });

export const retrievePaymentIntent = (key, paymentIntentId) =>
  stripeClient.request({
    method: "GET",
    path: `/payment_intents/${encodeURIComponent(paymentIntentId)}`,
    key,
    params: { expand: ["latest_charge"] },
  });
