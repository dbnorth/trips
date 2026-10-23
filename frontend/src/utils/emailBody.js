export const emailBodyIsBlank = (body) =>
  !String(body || "")
    .replace(/<img\b[^>]*>/gi, "picture")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
