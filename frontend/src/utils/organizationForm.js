import { normalizeAddressFields, US_COUNTRY_CODE } from "./locationData.js";

export const COLOR_OPTIONS = ["blue", "teal", "green", "purple", "red", "orange"];

export const emptyOrganizationForm = () => ({
  id: null,
  name: "",
  accountNumber: "",
  addLine1: "",
  addLine2: "",
  city: "",
  country: US_COUNTRY_CODE,
  state_prov: "",
  postalCode: "",
  phoneContryCode: "",
  phoneNumber: "",
  email: "",
  websiteUrl: "",
  facebookPage: "",
  instagram: "",
  logo: null,
  agreementFileName: null,
  medicalAgreementFileName: null,
  colorFamily: "blue",
  subdomain: "",
  testMode: false,
  stripeSecretKey: "",
  stripeTestSecretKey: "",
  stripeKeySaved: false,
  stripeTestKeySaved: false,
  stripeFeeCoverage: false,
  version: 0,
});

/** The first Stripe key that has the wrong prefix, as a message, or "". Blank keys keep the saved key. */
export const stripeKeyError = (form) => {
  const live = form.stripeSecretKey?.trim();
  if (live && !/^(sk|rk)_live_/.test(live)) return "Enter a live Stripe secret key (sk_live_ or rk_live_).";
  const test = form.stripeTestSecretKey?.trim();
  if (test && !/^(sk|rk)_test_/.test(test)) return "Enter a test Stripe secret key (sk_test_ or rk_test_).";
  return "";
};

export const buildOrganizationPayload = (form, { includeVersion = false } = {}) => {
  const address = normalizeAddressFields(form);
  const subdomainRaw = form.subdomain?.trim() || "";
  const payload = {
    name: form.name.trim(),
    accountNumber: form.accountNumber?.trim() || null,
    country: address.country || null,
    addLine1: form.addLine1?.trim() || null,
    addLine2: form.addLine2?.trim() || null,
    city: form.city?.trim() || null,
    state_prov: address.state_prov || null,
    postalCode: form.postalCode?.trim() || null,
    phoneContryCode: form.phoneContryCode?.trim() || null,
    phoneNumber: form.phoneNumber?.trim() || null,
    email: form.email?.trim() || null,
    websiteUrl: form.websiteUrl?.trim() || null,
    facebookPage: form.facebookPage?.trim() || null,
    instagram: form.instagram?.trim() || null,
    colorFamily: form.colorFamily || "blue",
    subdomain: subdomainRaw === "" ? null : subdomainRaw.toLowerCase(),
    testMode: !!form.testMode,
    stripeFeeCoverage: !!form.stripeFeeCoverage,
  };
  if (form.stripeSecretKey?.trim()) payload.stripeSecretKey = form.stripeSecretKey.trim();
  if (form.stripeTestSecretKey?.trim()) payload.stripeTestSecretKey = form.stripeTestSecretKey.trim();
  if (includeVersion) payload.version = form.version;
  return payload;
};
