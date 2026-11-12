/**
 * Feature 100 — Stripe Donations
 * Spec: features/feature-100-stripe-donations.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import OrganizationFormFields from "../src/components/OrganizationFormFields.vue";
import DonorParticipantPage from "../src/views/DonorParticipantPage.vue";
import ParticipantDonateDialog from "../src/components/ParticipantDonateDialog.vue";
import MakeDonationDialog from "../src/components/MakeDonationDialog.vue";
import DonationCompletePage from "../src/views/DonationCompletePage.vue";
import DonationFormDialog from "../src/components/DonationFormDialog.vue";
import DonationsList from "../src/views/DonationsList.vue";
import StripePaymentMethod from "../src/components/StripePaymentMethod.vue";
import MoneyInput from "../src/components/MoneyInput.vue";
import Utils from "../src/config/utils.js";
import { buildOrganizationPayload, emptyOrganizationForm } from "../src/utils/organizationForm.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/publicServices.js", () => ({
  default: {
    getTripBySlug: vi.fn(),
    getParticipantBySlug: vi.fn(),
    startCheckout: vi.fn(),
    checkCheckout: vi.fn(),
    searchDonors: vi.fn(),
  },
}));

vi.mock("../src/services/donationServices.js", () => ({
  default: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    startParticipantCheckout: vi.fn(),
    startStaffCheckout: vi.fn(),
  },
}));

vi.mock("../src/services/tripServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/exportServices.js", () => ({
  default: { donationsCsv: vi.fn() },
}));

vi.mock("../src/services/donorServices.js", () => ({
  default: { lookupByEmail: vi.fn(), lookup: vi.fn() },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: { getPictureUrl: vi.fn(() => null) },
}));

vi.mock("../src/components/DonorTripHeading.vue", () => ({
  default: { name: "DonorTripHeading", template: "<div />", props: ["trip"] },
}));

vi.mock("../src/utils/stripeDonations.js", async (importOriginal) => ({
  ...(await importOriginal()),
  goToStripe: vi.fn(),
}));

import PublicServices from "../src/services/publicServices.js";
import DonationServices from "../src/services/donationServices.js";
import TripServices from "../src/services/tripServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import ExportServices from "../src/services/exportServices.js";
import { goToStripe } from "../src/utils/stripeDonations.js";
import DonorServices from "../src/services/donorServices.js";

const STRIPE_URL = "https://checkout.stripe.com/c/pay/cs_1";
const NOT_SET_UP = "Online donations aren't set up for this organization yet.";
const ORG_ID = 3;
const TRIP = { id: 11, name: "Guatemala Clinic 2027", orgId: ORG_ID, participantCost: 1500, onlineDonations: true };
const ANA = { id: 5, firstName: "Ana", lastName: "Lopez" };

const STUBS = {
  VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
};

const button = (wrapper, label) => wrapper.findAll("button").find((b) => b.text().trim() === label);

const field = (wrapper, label) =>
  wrapper.findAllComponents({ name: "VTextField" }).find((c) => c.props("label") === label);

const select = (wrapper, label) =>
  wrapper.findAllComponents({ name: "VSelect" }).find((c) => c.props("label") === label);

const checkedPaymentMethod = (wrapper) =>
  wrapper
    .findComponent(StripePaymentMethod)
    .findAll('input[type="radio"]')
    .find((input) => input.element.checked)
    ?.element.value;

const mountParticipantPage = async (onlineDonations) => {
  PublicServices.getTripBySlug.mockResolvedValue({ data: { trip: TRIP } });
  PublicServices.getParticipantBySlug.mockResolvedValue({
    data: { participant: ANA, whygoText: "", donationTotal: 0, onlineDonations },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/donate/trip/:tripSlug/participant/:personSlug",
        name: "donorParticipant",
        component: DonorParticipantPage,
        props: true,
      },
    ],
  });
  await router.push("/donate/trip/Guatemala_Clinic_2027/participant/Ana_Lopez");
  await router.isReady();
  const { wrapper } = await mountWithPlugins(DonorParticipantPage, {
    router,
    props: { tripSlug: "Guatemala_Clinic_2027", personSlug: "Ana_Lopez" },
  });
  await flushPromises();
  return wrapper;
};

const mountCompletePage = async () => {
  const { wrapper } = await mountWithPlugins(DonationCompletePage, { props: { token: "tok_1" } });
  await flushPromises();
  return wrapper;
};

const completedAnswer = (fields = {}) => ({
  status: "completed",
  paymentStatus: "succeeded",
  failureMessage: null,
  amount: 50,
  tripName: "Guatemala Clinic 2027",
  participantName: "Ana Lopez",
  receiptUrl: "https://pay.stripe.com/receipts/ch_1",
  returnPath: "/home",
  ...fields,
});

const mountDonationForm = async (props = {}) => {
  const { wrapper } = await mountWithPlugins(DonationFormDialog, {
    props: { modelValue: false, tripId: TRIP.id, personId: ANA.id, onlineDonations: true, ...props },
    global: { stubs: STUBS },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  return wrapper;
};

const ORG_ADMIN = { orgRoles: [{ orgId: ORG_ID, roleName: "Org Admin" }], tripRoles: [] };

const mountDonationsList = async () => {
  Utils.setStore("user", ORG_ADMIN);
  TripServices.getAll.mockResolvedValue({ data: [TRIP] });
  TripPeopleRoleServices.getAll.mockResolvedValue({ data: [{ id: 1 }] });
  const { wrapper } = await mountWithPlugins(DonationsList, { global: { stubs: STUBS } });
  await flushPromises();
  return wrapper;
};

describe("Feature 131 — Donor lookup by name or email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("Add donation looks up a donor by name", async () => {
    DonorServices.lookup.mockResolvedValue({
      data: {
        matches: [
          { id: 1, firstName: "Ada", lastName: "Smith", email: "ada@example.com", city: "Cabot", state_prov: "AR", donorType: "individual" },
          { id: 2, firstName: "Ben", lastName: "Smith", email: "ben@example.com", city: "Austin", state_prov: "TX", donorType: "individual" },
        ],
      },
    });
    const wrapper = await mountDonationForm();
    await field(wrapper, "Name or email").find("input").setValue("Smith");
    await button(wrapper, "Look up").trigger("click");
    await flushPromises();

    expect(DonorServices.lookup).toHaveBeenCalledWith("Smith", TRIP.id);
    expect(wrapper.text()).toContain("Several donors match. Choose one.");
    await button(wrapper, "Ada Smith — Cabot, AR — ada@example.com").trigger("click");
    expect(field(wrapper, "Donor first name").props("modelValue")).toBe("Ada");
  });

  it("The public donation page looks up a donor by name", async () => {
    PublicServices.searchDonors.mockResolvedValue({
      data: {
        matches: [
          { id: 9, name: "Ada Smith", city: "Cabot", state: "AR" },
          { id: 10, name: "Ben Smith", city: "Austin", state: "TX" },
        ],
      },
    });
    const wrapper = await mountParticipantPage(true);
    await field(wrapper, "Name or email").find("input").setValue("Ada");
    await button(wrapper, "Look up").trigger("click");
    await flushPromises();

    expect(PublicServices.searchDonors).toHaveBeenCalledWith(TRIP.id, "Ada");
    expect(wrapper.text()).toContain("Several donors match. Choose one.");
    expect(wrapper.text()).toContain("Ada Smith — Cabot, AR");
    await button(wrapper, "Ada Smith — Cabot, AR").trigger("click");
    expect(wrapper.text()).toContain("Donor found.");
    expect(field(wrapper, "Your first name").props("modelValue")).toBe("Ada Smith");
  });
});

describe("Feature 100 — Stripe Donations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("US-100.1 — Connect an organization's Stripe account", () => {
    it("Edit organization shows the Stripe section", async () => {
      const { wrapper } = await mountWithPlugins(OrganizationFormFields, {
        props: { modelValue: { ...emptyOrganizationForm(), stripeKeySaved: true, stripeTestKeySaved: true } },
      });

      const section = wrapper.find('[data-testid="org-stripe-section"]');
      expect(section.text()).toContain("Test mode uses the test key.");
      for (const label of ["Stripe secret key", "Stripe test secret key"]) {
        const input = field(wrapper, label);
        expect(input.props("modelValue")).toBe("");
        expect(input.props("hint")).toBe("A key is saved. Leave blank to keep it.");
      }
      expect(section.text().match(/A key is saved\. Leave blank to keep it\./g)).toHaveLength(2);

      const feeCoverage = wrapper
        .findAllComponents({ name: "VCheckbox" })
        .find((c) => c.props("label") === "Ask donors to cover processing fees");
      expect(feeCoverage.props("modelValue")).toBe(false);
      expect(feeCoverage.props("hint")).toBe(
        "Stripe asks card donors to add its processing fee. Turn on only after Stripe approves your account for fee coverage."
      );
      await feeCoverage.find("input").setValue(true);
      expect(buildOrganizationPayload(wrapper.props("modelValue")).stripeFeeCoverage).toBe(true);
    });
  });

  describe("US-100.2 — Donors pay with Stripe on the public donation pages", () => {
    it("Online donations not set up", async () => {
      const wrapper = await mountParticipantPage(false);

      expect(wrapper.text()).toContain(NOT_SET_UP);
      expect(wrapper.findComponent(StripePaymentMethod).exists()).toBe(false);
      expect(button(wrapper, "Pay with Stripe")).toBeUndefined();
    });

    it("The public page sends the donor to Stripe", async () => {
      PublicServices.startCheckout.mockResolvedValue({ data: { checkoutUrl: STRIPE_URL } });
      const wrapper = await mountParticipantPage(true);

      expect(wrapper.text()).toContain("Credit card");
      expect(wrapper.text()).toContain("Bank account (ACH)");
      expect(checkedPaymentMethod(wrapper)).toBe("card");
      expect(wrapper.text()).not.toContain("Payment info");
      expect(wrapper.text()).not.toContain(NOT_SET_UP);

      await field(wrapper, "Your first name").find("input").setValue("Carl");
      await field(wrapper, "Your last name").find("input").setValue("Diaz");
      await field(wrapper, "Email").find("input").setValue("carl@example.com");
      await field(wrapper, "Amount").find("input").setValue("50");
      await wrapper.find('input[type="radio"][value="us_bank_account"]').setValue();
      await button(wrapper, "Pay with Stripe").trigger("click");
      await flushPromises();

      expect(PublicServices.startCheckout).toHaveBeenCalledWith({
        tripId: TRIP.id,
        personId: ANA.id,
        amount: 50,
        paymentMethod: "us_bank_account",
        donor: { firstName: "Carl", lastName: "Diaz", email: "carl@example.com" },
        returnPath: "/donate/trip/Guatemala_Clinic_2027/participant/Ana_Lopez",
      });
      expect(goToStripe).toHaveBeenCalledWith(STRIPE_URL);
    });
  });

  describe("US-100.3 — Participants pay with Stripe from the Donate and Make Donation dialogs", () => {
    it("The Donate and Make Donation dialogs pay with Stripe", async () => {
      DonationServices.startParticipantCheckout.mockResolvedValue({ data: { checkoutUrl: STRIPE_URL } });
      const { wrapper: donate } = await mountWithPlugins(ParticipantDonateDialog, {
        props: {
          modelValue: false,
          tripId: TRIP.id,
          personId: ANA.id,
          recipients: [{ personId: ANA.id, firstName: "Ana", lastName: "Lopez" }],
          onlineDonations: true,
          returnPath: "/home",
        },
        global: { stubs: STUBS },
      });
      await donate.setProps({ modelValue: true });
      await flushPromises();

      expect(select(donate, "Donate to").exists()).toBe(true);
      expect(donate.findComponent(MoneyInput).exists()).toBe(true);
      expect(checkedPaymentMethod(donate)).toBe("card");
      expect(donate.text()).not.toContain("Payment info");
      expect(select(donate, "Donate to").props("modelValue")).toBe(ANA.id);
      donate.findComponent(MoneyInput).vm.$emit("update:modelValue", "25");
      await button(donate, "Pay with Stripe").trigger("click");
      await flushPromises();

      expect(DonationServices.startParticipantCheckout).toHaveBeenCalledWith({
        tripId: TRIP.id,
        personId: ANA.id,
        amount: 25,
        paymentMethod: "card",
        returnPath: "/home",
      });
      expect(goToStripe).toHaveBeenCalledWith(STRIPE_URL);

      DonationServices.startParticipantCheckout.mockClear();
      const { wrapper: make } = await mountWithPlugins(MakeDonationDialog, {
        props: { modelValue: false, tripId: TRIP.id, personId: ANA.id, onlineDonations: true, returnPath: "/my-trips/11" },
        global: { stubs: STUBS },
      });
      await make.setProps({ modelValue: true });
      await flushPromises();

      expect(checkedPaymentMethod(make)).toBe("card");
      expect(make.text()).not.toContain("Payment info");
      make.findComponent(MoneyInput).vm.$emit("update:modelValue", "25");
      await button(make, "Pay with Stripe").trigger("click");
      await flushPromises();

      expect(DonationServices.startParticipantCheckout).toHaveBeenCalledWith({
        tripId: TRIP.id,
        personId: ANA.id,
        amount: 25,
        paymentMethod: "card",
        returnPath: "/my-trips/11",
      });
    });
  });

  describe("US-100.4 — A completed Stripe payment is recorded", () => {
    it("The return page thanks the donor", async () => {
      PublicServices.checkCheckout.mockResolvedValue({ data: completedAnswer() });
      const wrapper = await mountCompletePage();

      expect(PublicServices.checkCheckout).toHaveBeenCalledWith("tok_1");
      expect(wrapper.text()).toContain("Thank you for your donation!");
      expect(wrapper.text()).toContain("$50.00 to Guatemala Clinic 2027 for Ana Lopez");
      const receipt = wrapper.findAll("a").find((a) => a.text().trim() === "Receipt");
      expect(receipt.attributes("href")).toBe("https://pay.stripe.com/receipts/ch_1");
      expect(receipt.attributes("target")).toBe("_blank");
      expect(wrapper.findAll("a").some((a) => a.text().trim() === "Back")).toBe(true);
    });

    it("The return page waits for confirmation", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      PublicServices.checkCheckout.mockResolvedValue({ data: { status: "pending", returnPath: "/home" } });
      const wrapper = await mountCompletePage();

      expect(wrapper.text()).toContain("Waiting for Stripe to confirm your payment…");
      expect(PublicServices.checkCheckout).toHaveBeenCalledTimes(1);
      for (let i = 0; i < 6; i += 1) {
        await vi.advanceTimersByTimeAsync(5000);
        await flushPromises();
      }

      expect(PublicServices.checkCheckout).toHaveBeenCalledTimes(7);
      expect(wrapper.text()).toContain(
        "Your payment hasn't been confirmed yet. If you paid, it will be recorded shortly."
      );
      await vi.advanceTimersByTimeAsync(5000);
      expect(PublicServices.checkCheckout).toHaveBeenCalledTimes(7);
    });
  });

  describe("US-100.5 — Staff record donations by type", () => {
    it("The donation form shows Pay with Stripe or Save by type", async () => {
      DonationServices.startStaffCheckout.mockResolvedValue({ data: { checkoutUrl: STRIPE_URL } });
      const wrapper = await mountDonationForm();

      const type = select(wrapper, "Type");
      expect(type.props("items")).toEqual(["Stripe-ACH", "Stripe-Credit", "Check", "Other"]);
      expect(type.props("modelValue")).toBe("Other");
      expect(field(wrapper, "Check number")).toBeUndefined();
      expect(button(wrapper, "Save")).toBeTruthy();

      type.vm.$emit("update:modelValue", "Check");
      await flushPromises();
      expect(field(wrapper, "Check number")).toBeTruthy();
      expect(button(wrapper, "Save")).toBeTruthy();
      await field(wrapper, "Donor first name").find("input").setValue("Carl");
      wrapper.findComponent(MoneyInput).vm.$emit("update:modelValue", "75");
      await button(wrapper, "Save").trigger("click");
      await flushPromises();
      expect(wrapper.text()).toContain("Check number is required.");
      expect(DonationServices.create).not.toHaveBeenCalled();

      select(wrapper, "Type").vm.$emit("update:modelValue", "Stripe-Credit");
      await flushPromises();
      expect(field(wrapper, "Check number")).toBeUndefined();
      expect(field(wrapper, "Date")).toBeUndefined();
      expect(button(wrapper, "Save")).toBeUndefined();
      await button(wrapper, "Pay with Stripe").trigger("click");
      await flushPromises();

      expect(DonationServices.startStaffCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: TRIP.id,
          personId: ANA.id,
          amount: 75,
          paymentMethod: "card",
          returnPath: "/donations",
          donor: expect.objectContaining({ firstName: "Carl" }),
        })
      );
      expect(goToStripe).toHaveBeenCalledWith(STRIPE_URL);

      const notSetUp = await mountDonationForm({ onlineDonations: false });
      select(notSetUp, "Type").vm.$emit("update:modelValue", "Stripe-ACH");
      await flushPromises();
      expect(notSetUp.text()).toContain(NOT_SET_UP);
      expect(button(notSetUp, "Pay with Stripe").attributes("disabled")).toBeDefined();
    });
  });

  describe("US-100.7 — Donations for a date range, with CSV", () => {
    it("The Donations page uses the date range", async () => {
      DonationServices.getAll.mockResolvedValue({ data: [] });
      ExportServices.donationsCsv.mockResolvedValue();
      const wrapper = await mountDonationsList();

      await field(wrapper, "Start date").find("input").setValue("2027-01-10");
      await field(wrapper, "End date").find("input").setValue("2027-01-31");
      await flushPromises();

      expect(DonationServices.getAll).toHaveBeenCalledWith(TRIP.id, {
        startDate: "2027-01-10",
        endDate: "2027-01-31",
      });
      await button(wrapper, "Export CSV").trigger("click");
      expect(ExportServices.donationsCsv).toHaveBeenCalledWith(TRIP.id, {
        startDate: "2027-01-10",
        endDate: "2027-01-31",
      });

      await field(wrapper, "Start date").find("input").setValue("2027-02-10");
      await flushPromises();
      expect(wrapper.text()).toContain("Start date must be on or before End date.");
      expect(button(wrapper, "Export CSV").attributes("disabled")).toBeDefined();
    });
  });

  describe("US-100.8 — Bank payments are tracked until they clear", () => {
    it("The return page explains a processing bank payment", async () => {
      PublicServices.checkCheckout.mockResolvedValue({
        data: completedAnswer({ paymentStatus: "processing", receiptUrl: null }),
      });
      const wrapper = await mountCompletePage();

      expect(wrapper.text()).toContain("Thank you for your donation!");
      expect(wrapper.text()).toContain("$50.00 to Guatemala Clinic 2027 for Ana Lopez");
      expect(wrapper.text()).toContain(
        "Your bank payment is processing. It usually takes up to 4 business days to clear."
      );
      expect(wrapper.findAll("a").some((a) => a.text().trim() === "Back")).toBe(true);
    });

    it("The Donations page shows payment status", async () => {
      const stripeCredit = {
        id: 1,
        tripId: TRIP.id,
        dateTime: "2027-01-15T14:30:00Z",
        amount: 50,
        donationType: "Stripe-Credit",
        paymentStatus: "succeeded",
        stripePaymentMethodType: "card",
        stripePaymentMethodBrand: "visa",
        stripePaymentMethodLast4: "4242",
        stripePaymentIntentId: "pi_1",
        stripeReceiptUrl: "https://pay.stripe.com/receipts/ch_1",
        donor: { firstName: "Carl", lastName: "Diaz" },
      };
      DonationServices.getAll.mockResolvedValue({
        data: [
          stripeCredit,
          { id: 2, tripId: TRIP.id, amount: 40, donationType: "Stripe-ACH", paymentStatus: "processing", donor: {} },
          { id: 3, tripId: TRIP.id, amount: 30, donationType: "Stripe-ACH", paymentStatus: "failed", donor: {} },
          { id: 4, tripId: TRIP.id, amount: 100, donationType: "Check", checkNumber: "1042", paymentStatus: null, donor: {} },
        ],
      });
      const wrapper = await mountDonationsList();

      const rows = wrapper.findAll("tbody tr").map((tr) => tr.findAll("td").map((td) => td.text().trim()));
      expect(rows.map((cells) => cells[4])).toEqual(["Stripe-Credit", "Stripe-ACH", "Stripe-ACH", "Check #1042"]);
      expect(rows.map((cells) => cells[5])).toEqual(["Succeeded", "Processing", "Failed", "—"]);
      expect(wrapper.text()).toContain("$150.00");

      await wrapper.findAll("tbody tr")[0].find('button[aria-label="Edit"]').trigger("click");
      await flushPromises();
      const details = wrapper.find('[data-testid="stripe-donation-details"]');
      expect(details.text()).toContain("Payment status");
      expect(details.text()).toContain("Succeeded");
      expect(details.text()).toContain("Payment method");
      expect(details.text()).toContain("Visa •••• 4242");
      expect(select(wrapper, "Type")).toBeUndefined();
    });
  });

  describe("US-100.9 — Donors can cover the processing fee", () => {
    it("Staff and donors see the covered fee", async () => {
      DonationServices.getAll.mockResolvedValue({
        data: [
          {
            id: 1,
            tripId: TRIP.id,
            dateTime: "2027-01-15T14:30:00Z",
            amount: 50,
            processingFeeAmount: "1.75",
            donationType: "Stripe-Credit",
            paymentStatus: "succeeded",
            stripePaymentIntentId: "pi_3",
            donor: { firstName: "Carl", lastName: "Diaz" },
          },
          { id: 2, tripId: TRIP.id, amount: 100, donationType: "Check", checkNumber: "1042", paymentStatus: null, donor: {} },
        ],
      });
      const wrapper = await mountDonationsList();

      const rows = wrapper.findAll("tbody tr").map((tr) => tr.findAll("td").map((td) => td.text().trim()));
      expect(rows.map((cells) => cells[3])).toEqual(["$1.75", "—"]);

      await wrapper.findAll("tbody tr")[0].find('button[aria-label="Edit"]').trigger("click");
      await flushPromises();
      const details = wrapper.find('[data-testid="stripe-donation-details"]');
      expect(details.text()).toContain("Fee covered");
      expect(details.text()).toContain("$1.75");

      PublicServices.checkCheckout.mockResolvedValue({ data: completedAnswer({ feeCovered: 1.75 }) });
      const page = await mountCompletePage();
      expect(page.text()).toContain("Thank you for also covering the $1.75 processing fee.");

      PublicServices.checkCheckout.mockResolvedValue({ data: completedAnswer({ feeCovered: null }) });
      const noFee = await mountCompletePage();
      expect(noFee.find('[data-testid="donation-fee-line"]').exists()).toBe(false);
    });
  });
});
