import { normalizeAddressFields } from "./locationData.js";

export const COLOR_OPTIONS = ["blue", "teal", "green", "purple", "red", "orange"];

export const emptyOrganizationForm = () => ({
  id: null,
  name: "",
  addLine1: "",
  addLine2: "",
  city: "",
  country: "",
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
  colorFamily: "blue",
  version: 0,
});

export const buildOrganizationPayload = (form, { includeVersion = false } = {}) => {
  const address = normalizeAddressFields(form);
  const payload = {
    name: form.name.trim(),
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
  };
  if (includeVersion) payload.version = form.version;
  return payload;
};
