export const VERSION_RELOAD_MESSAGE =
  "This data has changed since it was loaded. The latest data has been reloaded. Review your changes and save again.";

export const isVersionConflict = (error) => error?.response?.status === 409;
