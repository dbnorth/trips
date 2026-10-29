<script setup>
import { ref, computed, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import EmailPictureServices from "../services/emailPictureServices.js";

const LINK_PATTERN = /^(https?:\/\/|mailto:)\S+$/i;
const HTML_TAG = /<\/?[a-z][a-z0-9]*\b[^>]*>/i;
const MAX_PICTURE_WIDTH = 600;

const pictureWidth = (value) => {
  const pixels = Math.round(Number(value));
  return pixels > 0 ? Math.min(MAX_PICTURE_WIDTH, pixels) : null;
};

const props = defineProps({
  modelValue: { type: String, default: "" },
  orgId: { type: [Number, String], default: null },
  label: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const pictures = ref([]);
const loaded = ref(false);
const error = ref("");
const uploading = ref(false);
const showPicker = ref(false);
const showLink = ref(false);
const linkUrl = ref("");
const linkError = ref("");
const fileInput = ref(null);
let lastEmitted = null;

const hasOrg = computed(() => props.orgId != null && props.orgId !== "");
const pictureById = computed(() => new Map(pictures.value.map((p) => [String(p.id), p])));

const LibraryImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => pictureWidth(element.getAttribute("width")),
        renderHTML: (attributes) => {
          const width = pictureWidth(attributes.width);
          return width ? { width } : {};
        },
      },
      height: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
      pictureId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-picture-id"),
        renderHTML: (attributes) =>
          attributes.pictureId ? { "data-picture-id": attributes.pictureId } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-picture-id]" }];
  },
}).configure({
  inline: true,
  resize: {
    enabled: true,
    directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
    minWidth: 50,
    minHeight: 20,
    alwaysPreserveAspectRatio: true,
  },
});

const escapeHtml = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const withLibraryPictures = (html) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const img of doc.querySelectorAll("img")) {
    const picture = pictureById.value.get(img.getAttribute("data-picture-id") || "");
    if (!picture) {
      img.remove();
      continue;
    }
    img.setAttribute("src", EmailPictureServices.fileUrl(picture));
    img.setAttribute("alt", picture.name);
  }
  return doc.body.innerHTML;
};

const toEditorHtml = (value) => {
  const body = String(value || "");
  if (!body) return "";
  if (!HTML_TAG.test(body)) return `<p>${escapeHtml(body).replace(/\r?\n/g, "<br>")}</p>`;
  return withLibraryPictures(body);
};

const insertPicture = (picture) => {
  editor.value
    ?.chain()
    .focus()
    .setImage({
      src: EmailPictureServices.fileUrl(picture),
      alt: picture.name,
      pictureId: String(picture.id),
    })
    .run();
  showPicker.value = false;
};

const uploadAndInsert = async (file) => {
  uploading.value = true;
  error.value = "";
  try {
    const res = await EmailPictureServices.upload(props.orgId, file);
    pictures.value = [...pictures.value, res.data].sort((a, b) => a.name.localeCompare(b.name));
    insertPicture(res.data);
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to upload the picture.";
  } finally {
    uploading.value = false;
  }
};

const uploadFiles = (fileList) => {
  const files = [...(fileList || [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length || !hasOrg.value) return false;
  files.reduce((previous, file) => previous.then(() => uploadAndInsert(file)), Promise.resolve());
  return true;
};

const editor = useEditor({
  content: "",
  editable: false,
  extensions: [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      strike: false,
      link: { openOnClick: false },
    }),
    LibraryImage,
    TextAlign.configure({ types: ["paragraph"], alignments: ["center"], defaultAlignment: null }),
  ],
  editorProps: {
    transformPastedHTML: (html) => withLibraryPictures(html),
    handlePaste: (view, event) => uploadFiles(event.clipboardData?.files),
    handleDrop: (view, event, slice, moved) => !moved && uploadFiles(event.dataTransfer?.files),
  },
  onUpdate: ({ editor: current }) => {
    lastEmitted = current.isEmpty ? "" : current.getHTML();
    emit("update:modelValue", lastEmitted);
  },
});

const setEditorContent = (value) => {
  lastEmitted = value;
  editor.value?.commands.setContent(toEditorHtml(value), { emitUpdate: false });
};

const loadPictures = async () => {
  loaded.value = false;
  error.value = "";
  pictures.value = [];
  if (hasOrg.value) {
    try {
      const res = await EmailPictureServices.getAll(props.orgId);
      pictures.value = res.data || [];
    } catch (e) {
      error.value = e.response?.data?.message || "Unable to load pictures.";
    }
  }
  loaded.value = true;
};

watch(() => props.orgId, loadPictures, { immediate: true });

watch([editor, loaded], ([current, ready]) => {
  if (current && ready) setEditorContent(props.modelValue);
});

watch(
  () => props.modelValue,
  (value) => {
    if (value !== lastEmitted && loaded.value) setEditorContent(value);
  }
);

watch([editor, loaded, () => props.disabled], ([current, ready, disabled]) => {
  current?.setEditable(ready && !disabled, false);
});

const insertText = (text) => {
  editor.value?.chain().focus().insertContent({ type: "text", text }).run();
};

const openLink = () => {
  linkUrl.value = editor.value?.getAttributes("link").href || "";
  linkError.value = "";
  showLink.value = true;
};

const applyLink = () => {
  const url = linkUrl.value.trim();
  const current = editor.value;
  if (!url) {
    current.chain().focus().extendMarkRange("link").unsetLink().run();
    showLink.value = false;
    return;
  }
  if (!LINK_PATTERN.test(url)) {
    linkError.value = "Links must start with http://, https://, or mailto:.";
    return;
  }
  if (current.state.selection.empty && !current.isActive("link")) {
    current
      .chain()
      .focus()
      .insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] })
      .run();
  } else {
    current.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }
  showLink.value = false;
};

const onFileChosen = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (file) await uploadAndInsert(file);
};

const toolbar = computed(() => [
  { label: "Bold", icon: "mdi-format-bold", mark: "bold", run: (c) => c.toggleBold() },
  { label: "Italic", icon: "mdi-format-italic", mark: "italic", run: (c) => c.toggleItalic() },
  { label: "Underline", icon: "mdi-format-underline", mark: "underline", run: (c) => c.toggleUnderline() },
  { label: "Bulleted list", icon: "mdi-format-list-bulleted", mark: "bulletList", run: (c) => c.toggleBulletList() },
  { label: "Numbered list", icon: "mdi-format-list-numbered", mark: "orderedList", run: (c) => c.toggleOrderedList() },
  {
    label: "Center",
    icon: "mdi-format-align-center",
    mark: { textAlign: "center" },
    run: (c) => c.toggleTextAlign("center"),
  },
]);

const runCommand = (item) => item.run(editor.value.chain().focus()).run();

const editable = computed(() => loaded.value && !props.disabled);

defineExpose({ insertText, editor });
</script>

<template>
  <div class="rich-text-editor flex-grow-1 mb-2">
    <div v-if="label" class="text-caption text-medium-emphasis mb-1">{{ label }}</div>
    <div class="border rounded" :class="{ 'rich-text-disabled': !editable }">
      <div class="d-flex flex-wrap align-center ga-1 pa-1 border-b">
        <v-btn
          v-for="item in toolbar"
          :key="item.label"
          :icon="item.icon"
          :aria-label="item.label"
          :title="item.label"
          size="small"
          variant="text"
          :active="!!editor?.isActive(item.mark)"
          :disabled="!editable"
          @click="runCommand(item)"
        />
        <v-btn
          icon="mdi-link-variant"
          aria-label="Link"
          title="Link"
          size="small"
          variant="text"
          :active="!!editor?.isActive('link')"
          :disabled="!editable"
          @click="openLink"
        />
        <v-btn
          v-if="hasOrg"
          icon="mdi-image-outline"
          aria-label="Picture"
          title="Picture"
          size="small"
          variant="text"
          :disabled="!editable"
          @click="showPicker = true"
        />
      </div>
      <EditorContent :editor="editor" class="rich-text-content pa-3" data-testid="rich-text-content" />
    </div>
    <div v-if="error" class="text-caption text-error mt-1">{{ error }}</div>

    <v-dialog v-model="showPicker" max-width="640" scrollable>
      <v-card>
        <v-card-title>Pictures</v-card-title>
        <v-card-text>
          <div v-if="!pictures.length" class="text-body-2">No pictures in this library yet.</div>
          <div class="d-flex flex-wrap ga-3">
            <button
              v-for="picture in pictures"
              :key="picture.id"
              type="button"
              class="picture-choice border rounded pa-2 text-left"
              :data-testid="`picture-choice-${picture.id}`"
              @click="insertPicture(picture)"
            >
              <img :src="EmailPictureServices.fileUrl(picture)" :alt="picture.name" class="picture-thumb" />
              <div class="text-body-2 text-truncate">{{ picture.name }}</div>
            </button>
          </div>
          <div v-if="error" class="text-caption text-error mt-2">{{ error }}</div>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="tonal" :loading="uploading" @click="fileInput?.click()">Upload</v-btn>
          <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/heic,image/heif,.heic,.heif"
            hidden
            @change="onFileChosen"
          />
          <v-spacer />
          <v-btn variant="text" @click="showPicker = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showLink" max-width="420">
      <v-card>
        <v-card-title>Link</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="linkUrl"
            label="Link address"
            density="compact"
            hint="Leave empty to remove the link"
            persistent-hint
            :error-messages="linkError"
            autocomplete="off"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showLink = false">Cancel</v-btn>
          <v-btn color="primary" @click="applyLink">Apply</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.rich-text-content :deep(.ProseMirror) {
  min-height: 160px;
  outline: none;
}
.rich-text-content :deep(.ProseMirror p) {
  margin: 0 0 0.75em;
}
.rich-text-content :deep(.ProseMirror ul),
.rich-text-content :deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin-bottom: 0.75em;
}
.rich-text-content :deep(.ProseMirror img) {
  max-width: min(100%, 600px);
  height: auto;
}
.rich-text-content :deep([data-resize-handle]) {
  width: 10px;
  height: 10px;
  margin: -5px;
  background: rgb(var(--v-theme-primary));
  border: 1px solid #fff;
  border-radius: 2px;
  opacity: 0;
  z-index: 1;
}
.rich-text-content :deep([data-resize-container]:hover [data-resize-handle]),
.rich-text-content :deep(.ProseMirror-selectednode [data-resize-handle]) {
  opacity: 1;
}
.rich-text-content :deep([data-resize-handle="top-left"]),
.rich-text-content :deep([data-resize-handle="bottom-right"]) {
  cursor: nwse-resize;
}
.rich-text-content :deep([data-resize-handle="top-right"]),
.rich-text-content :deep([data-resize-handle="bottom-left"]) {
  cursor: nesw-resize;
}
.rich-text-disabled {
  opacity: 0.6;
}
.picture-choice {
  width: 140px;
  background: none;
  cursor: pointer;
}
.picture-thumb {
  width: 100%;
  height: 90px;
  object-fit: contain;
}
</style>
