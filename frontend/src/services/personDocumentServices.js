import apiClient from "./services.js";

const filenameFromDisposition = (disposition) => {
  const match = /filename="?([^"]+)"?/i.exec(disposition || "");
  return match?.[1] || "document";
};

export default {
  getAll(personId) {
    return apiClient.get(`/people/${personId}/documents`);
  },
  create(personId, data) {
    const form = new FormData();
    form.append("documentTypeId", data.documentTypeId);
    if (data.countryIssued) form.append("countryIssued", data.countryIssued);
    if (data.issueDate) form.append("issueDate", data.issueDate);
    form.append("expirationDate", data.expirationDate);
    form.append("document", data.file);
    return apiClient.post(`/people/${personId}/documents`, form);
  },
  update(personId, documentId, data) {
    const form = new FormData();
    form.append("documentTypeId", data.documentTypeId);
    if (data.countryIssued) form.append("countryIssued", data.countryIssued);
    if (data.issueDate) form.append("issueDate", data.issueDate);
    form.append("expirationDate", data.expirationDate);
    if (data.file) form.append("document", data.file);
    return apiClient.put(`/people/${personId}/documents/${documentId}`, form);
  },
  delete(personId, documentId) {
    return apiClient.delete(`/people/${personId}/documents/${documentId}`);
  },
  async download(personId, row) {
    const response = await apiClient.get(`/people/${personId}/documents/${row.id}/download`, {
      responseType: "blob",
    });
    const filename =
      filenameFromDisposition(response.headers?.["content-disposition"]) ||
      row.documentFileName?.split("/").pop() ||
      "document";
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
  async view(personId, row) {
    const response = await apiClient.get(`/people/${personId}/documents/${row.id}/view`, {
      responseType: "blob",
    });
    let blob = response.data;
    let type = blob?.type || response.headers?.["content-type"] || "";
    const name = String(row.documentFileName || "").toLowerCase();
    const isHeic =
      /image\/hei[cf]/i.test(type) ||
      name.endsWith(".heic") ||
      name.endsWith(".heif") ||
      ((type === "application/octet-stream" || !type) &&
        (name.endsWith(".heic") || name.endsWith(".heif")));

    if (isHeic) {
      const heic2any = (await import("heic2any")).default;
      const heicBlob =
        /image\/hei[cf]/i.test(type) ? blob : new Blob([blob], { type: "image/heic" });
      const converted = await heic2any({
        blob: heicBlob,
        toType: "image/jpeg",
        quality: 0.92,
      });
      blob = Array.isArray(converted) ? converted[0] : converted;
      type = blob?.type || "image/jpeg";
    }

    const url = URL.createObjectURL(blob);
    return { url, type };
  },
};
