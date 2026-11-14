/**
 * Back control for the Flights and rooming pages.
 * The trip page marks the navigation with state.from = "trip".
 */
export function tripPageBack(router, tripId, fallback) {
  router.currentRoute.value.fullPath;
  if (router.options.history.state?.from === "trip" && tripId != null && tripId !== "") {
    return {
      label: "Back to trip",
      go: () => router.push({ name: "tripView", params: { tripId: String(tripId) } }),
    };
  }
  return {
    label: fallback.label,
    go: () => router.push(fallback.to),
  };
}
