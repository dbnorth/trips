/** Trip prep checklist, in display order, keyed by the API's `prepStatus` fields. */
export const prepItems = [
  { key: "rolesFilled", label: "All roles filled" },
  { key: "participantsApproved", label: "All participants approved" },
  { key: "fundsRaised", label: "All funds raised" },
  { key: "flightsEntered", label: "Flights entered for all participants" },
  { key: "roomListComplete", label: "Room list includes all participants" },
];

export const prepComplete = (prepStatus) => prepItems.every((prep) => !!prepStatus?.[prep.key]);
