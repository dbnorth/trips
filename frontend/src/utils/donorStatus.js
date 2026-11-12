export const DONOR_TYPE_ITEMS = [
  { title: "Individual", value: "individual" },
  { title: "Organization", value: "organization" },
];

export const donorTypeLabel = (donorType) =>
  DONOR_TYPE_ITEMS.find((item) => item.value === donorType)?.title || donorType || "";

export const DONOR_STATUS_ITEMS = [
  { title: "Active", value: "active" },
  { title: "Inactive", value: "inactive" },
  { title: "No Email", value: "dontcontact" },
];

export const donorStatusLabel = (status) =>
  DONOR_STATUS_ITEMS.find((item) => item.value === status)?.title || status || "";
