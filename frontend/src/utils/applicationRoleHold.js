export const INCOMPLETE_ROLE_WARNING =
  "Saving an Incomplete application does not secure your role on the trip. Complete the application and required profile fields to be able to submit the application which will secure the role.";

export const SUBMIT_ROLE_NOTICE =
  "Submitting the application will hold your role on the trip pending review of your documents once they are uploaded.";

export const INCOMPLETE_SAVE_CONFIRM =
  "Your application data will be saved, but a role on the trip has not yet been secured.";

export const TRIP_INFO_ROLE_NOT_SECURED =
  "You do not have a role secured on this trip. Complete the application and profile required fields and submit the application.";

/** Warning or notice for the primary button, or null for Update Application and hidden buttons. */
export const roleHoldNotice = (label, shown) => {
  if (!shown) return null;
  if (label === "Save Incomplete Application") return { type: "warning", text: INCOMPLETE_ROLE_WARNING };
  if (label === "Submit Application") return { type: "info", text: SUBMIT_ROLE_NOTICE };
  return null;
};
