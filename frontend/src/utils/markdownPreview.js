/** Minimal Markdown → HTML for agreement preview (headings, lists, links, emphasis). */
export const markdownToHtml = (markdown) => {
  if (!markdown) return "";

  const escapeHtml = (text) =>
    String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const inline = (text) => {
    let out = escapeHtml(text);

    // Autolinks written as <https://...> become &lt;https://...&gt; after escape.
    out = out.replace(/&lt;(https?:\/\/[^&\s<>]+)&gt;/gi, (_, url) => {
      const safeUrl = escapeHtml(url);
      return `<a class="agreement-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
    });

    // Markdown links: [label](https://...)
    out = out.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a class="agreement-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    return out;
  };

  const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listType = null; // "ul" | "ol"
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  const openList = (type) => {
    if (listType === type) return;
    closeList();
    html.push(`<${type}>`);
    listType = type;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push("<hr />");
      continue;
    }

    // Unordered bullets. Require a space after *, but allow "-item" as well as "- item".
    const unordered =
      /^[-+•–—]\s*(.+)$/.exec(trimmed) || /^\*\s+(.+)$/.exec(trimmed);
    if (unordered) {
      flushParagraph();
      openList("ul");
      html.push(`<li>${inline(unordered[1])}</li>`);
      continue;
    }

    const ordered = /^(\d+)[.)]\s+(.+)$/.exec(trimmed);
    if (ordered) {
      flushParagraph();
      openList("ol");
      html.push(`<li>${inline(ordered[2])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  return html.join("\n");
};
