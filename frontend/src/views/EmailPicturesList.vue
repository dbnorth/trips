<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import EmailPictureServices from "../services/emailPictureServices.js";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import Utils from "../config/utils.js";

const pictures = ref([]);
const user = ref(null);
const loading = ref(false);
const uploading = ref(false);
const message = ref("");
const error = ref("");
const fileInput = ref(null);
const renaming = ref(null);
const renameName = ref("");
const renameError = ref("");
const savingName = ref(false);
const deleting = ref(null);
const deleteLoading = ref(false);

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));
const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));
const isOrgAdmin = computed(() => {
  if (isSystemAdmin.value) return true;
  const orgId = effectiveOrgId.value;
  if (!orgId) return false;
  return Utils.isOrgAdmin(user.value, orgId);
});
const canManage = computed(() => isOrgAdmin.value && !!effectiveOrgId.value);
const needsOrgSelection = computed(() => isSystemAdmin.value && !effectiveOrgId.value);
const orgLabel = computed(() => {
  const orgId = effectiveOrgId.value;
  if (!orgId) return null;
  return Utils.orgDisplayName(user.value, orgId);
});
const showOrgScopeNotice = computed(() => Utils.showOrgScopeNotice(user.value));

const sizeLabel = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const byName = (a, b) => a.name.localeCompare(b.name);

const load = () => {
  user.value = Utils.getStore("user");
  if (!canManage.value) {
    pictures.value = [];
    return Promise.resolve();
  }
  loading.value = true;
  error.value = "";
  return EmailPictureServices.getAll(effectiveOrgId.value)
    .then((r) => {
      pictures.value = r.data || [];
    })
    .catch((e) => {
      error.value = e.response?.data?.message || "Unable to load pictures.";
      pictures.value = [];
    })
    .finally(() => {
      loading.value = false;
    });
};

const onFileChosen = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  uploading.value = true;
  message.value = "";
  error.value = "";
  try {
    const res = await EmailPictureServices.upload(effectiveOrgId.value, file);
    pictures.value = [...pictures.value, res.data].sort(byName);
    message.value = "Picture uploaded.";
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to upload the picture.";
  } finally {
    uploading.value = false;
  }
};

const openRename = (picture) => {
  renaming.value = picture;
  renameName.value = picture.name;
  renameError.value = "";
};

const saveRename = async () => {
  savingName.value = true;
  renameError.value = "";
  try {
    const res = await EmailPictureServices.rename(renaming.value.id, renameName.value);
    pictures.value = pictures.value.map((p) => (p.id === res.data.id ? res.data : p)).sort(byName);
    renaming.value = null;
  } catch (e) {
    renameError.value = e.response?.data?.message || "Unable to rename the picture.";
  } finally {
    savingName.value = false;
  }
};

const confirmDelete = async () => {
  deleteLoading.value = true;
  message.value = "";
  error.value = "";
  try {
    await EmailPictureServices.delete(deleting.value.id);
    pictures.value = pictures.value.filter((p) => p.id !== deleting.value.id);
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to delete the picture.";
  } finally {
    deleteLoading.value = false;
    deleting.value = null;
  }
};

const onUserUpdated = () => {
  load();
};

watch(effectiveOrgId, () => {
  if (!user.value) return;
  load();
});

onMounted(() => {
  load();
  window.addEventListener("user-updated", onUserUpdated);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", onUserUpdated);
});
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Pictures</h1>
      <template v-if="canManage">
        <v-btn color="primary" :loading="uploading" @click="fileInput?.click()">Upload</v-btn>
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/gif"
          hidden
          data-testid="picture-upload-input"
          @change="onFileChosen"
        />
      </template>
    </div>

    <v-alert v-if="needsOrgSelection" type="warning" density="compact" class="mb-4">
      Select an organization using the menu bar to manage pictures.
    </v-alert>
    <v-alert v-else-if="!isOrgAdmin" type="warning" density="compact" class="mb-4">
      Only organization admins can manage pictures.
    </v-alert>
    <v-alert
      v-else-if="showOrgScopeNotice && orgLabel"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      Showing pictures for {{ orgLabel }}.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>
    <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

    <template v-if="canManage">
      <v-progress-linear v-if="loading" indeterminate class="mb-4" />
      <div v-else-if="!pictures.length" class="text-body-2">No pictures yet.</div>
      <div class="d-flex flex-wrap ga-4">
        <v-card
          v-for="picture in pictures"
          :key="picture.id"
          width="200"
          variant="outlined"
          :data-testid="`picture-${picture.id}`"
        >
          <img :src="EmailPictureServices.fileUrl(picture)" :alt="picture.name" class="picture-thumb" />
          <v-card-text class="pb-0">
            <div class="text-body-1 text-truncate">{{ picture.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ sizeLabel(picture.sizeBytes) }}</div>
          </v-card-text>
          <v-card-actions>
            <v-btn size="small" variant="text" @click="openRename(picture)">Rename</v-btn>
            <v-btn size="small" variant="text" color="error" @click="deleting = picture">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </template>

    <v-dialog :model-value="!!renaming" max-width="420" @update:model-value="(v) => !v && (renaming = null)">
      <v-card>
        <v-card-title>Rename picture</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="renameName"
            label="Name"
            density="compact"
            maxlength="100"
            :error-messages="renameError"
            autocomplete="off"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="renaming = null">Cancel</v-btn>
          <v-btn color="primary" :loading="savingName" @click="saveRename">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      :model-value="!!deleting"
      title="Delete picture"
      message="Delete this picture?"
      confirm-text="Delete"
      cancel-text="Cancel"
      :loading="deleteLoading"
      @update:model-value="(v) => !v && (deleting = null)"
      @confirm="confirmDelete"
    />
  </v-container>
</template>

<style scoped>
.picture-thumb {
  display: block;
  width: 100%;
  height: 130px;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.04);
}
</style>
