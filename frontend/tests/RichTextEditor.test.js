/**
 * Feature 77 — HTML Email Pictures
 * Spec: features/feature-77-html-email-pictures.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import RichTextEditor from "../src/components/RichTextEditor.vue";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/emailPictureServices.js", () => ({
  default: {
    getAll: vi.fn(),
    upload: vi.fn(),
    fileUrl: (picture) => `http://localhost:3200/trips/${picture.url}`,
  },
}));

import EmailPictureServices from "../src/services/emailPictureServices.js";

const CLINIC = { id: 5, name: "Clinic team", url: "images/email-pictures/org-3-abc.jpg" };

describe("Feature 77 — HTML Email Pictures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    EmailPictureServices.getAll.mockResolvedValue({ data: [CLINIC] });
  });

  const mountEditor = async (props) => {
    const { wrapper } = await mountWithPlugins(RichTextEditor, {
      props: { label: "Email body", ...props },
      global: {
        plugins: [vuetify],
        stubs: {
          VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
        },
      },
    });
    await flushPromises();
    return wrapper;
  };

  it("Editor inserts a library picture", async () => {
    const wrapper = await mountEditor({ modelValue: "Hi {{PARTICIPANT_FIRST_NAME}}", orgId: 3 });
    expect(EmailPictureServices.getAll).toHaveBeenCalledWith(3);
    expect(wrapper.find('[data-testid="rich-text-content"]').text()).toContain(
      "Hi {{PARTICIPANT_FIRST_NAME}}"
    );

    await wrapper.find('button[aria-label="Picture"]').trigger("click");
    await wrapper.find(`[data-testid="picture-choice-${CLINIC.id}"]`).trigger("click");
    await flushPromises();

    const shown = wrapper.find('[data-testid="rich-text-content"] img');
    expect(shown.attributes("src")).toBe(`http://localhost:3200/trips/${CLINIC.url}`);
    expect(shown.attributes("alt")).toBe("Clinic team");
    const body = wrapper.emitted("update:modelValue").at(-1)[0];
    expect(body).toContain('data-picture-id="5"');
    expect(body).toContain("Hi {{PARTICIPANT_FIRST_NAME}}");

    wrapper.unmount();
  });

  it("Editor keeps a resized picture's width", async () => {
    const wrapper = await mountEditor({
      modelValue: `<p>Hi</p><img data-picture-id="${CLINIC.id}" alt="Clinic team" width="300">`,
      orgId: 3,
    });

    const editor = wrapper.vm.editor;
    expect(wrapper.find('[data-testid="rich-text-content"] [data-resize-handle="bottom-right"]').exists()).toBe(true);
    editor.chain().setTextSelection(3).insertContent({ type: "text", text: " Ana" }).run();
    await flushPromises();

    const body = wrapper.emitted("update:modelValue").at(-1)[0];
    expect(body).toContain("<p>Hi Ana</p>");
    expect(body).toMatch(new RegExp(`<img[^>]*data-picture-id="${CLINIC.id}"[^>]*>`));
    expect(body).toContain('width="300"');

    wrapper.unmount();
  });

  it("Editor centers text and pictures", async () => {
    const wrapper = await mountEditor({
      modelValue: `<p>Welcome</p><p><img data-picture-id="${CLINIC.id}" alt="Clinic team"></p>`,
      orgId: 3,
    });
    const editor = wrapper.vm.editor;
    const center = wrapper.find('button[aria-label="Center"]');

    editor.commands.setTextSelection(2);
    await center.trigger("click");
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    await center.trigger("click");
    await flushPromises();

    const body = wrapper.emitted("update:modelValue").at(-1)[0];
    expect(body).toMatch(/^<p style="text-align: center;?">Welcome<\/p>/);
    expect(body).toMatch(
      new RegExp(`<p style="text-align: center;?"><img[^>]*data-picture-id="${CLINIC.id}"[^>]*></p>$`)
    );

    wrapper.unmount();
  });
});
