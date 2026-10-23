export const optimisticUpdate = async (Model, id, body, allowedFields, options = {}) => {
  const row = await Model.findByPk(id, options);
  if (!row) return { ok: false, status: 404, message: "Record not found." };
  const clientVersion = body.version;
  if (clientVersion != null && Number(clientVersion) !== Number(row.version)) {
    return { ok: false, status: 409, message: "Record was modified by another user. Please refresh and try again." };
  }
  const updates = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
  }
  updates.version = Number(row.version) + 1;
  await row.update(updates, options);
  return { ok: true, data: row };
};
