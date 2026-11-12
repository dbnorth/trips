/** Name as it appears in public page URLs: spaces become `_`, and `/`, `?`, `#` are dropped. */
export const toUrlSlug = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[/?#]+/g, "");
