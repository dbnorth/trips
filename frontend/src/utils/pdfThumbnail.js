/** An object URL of a PNG of the PDF's first page, `height` pixels tall. Rejects when the PDF can't be rendered. */
export const pdfFirstPageUrl = async (pdfUrl, height = 240) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  const loadingTask = pdfjs.getDocument({ url: pdfUrl });
  try {
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: height / page.getViewport({ scale: 1 }).height });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return URL.createObjectURL(png);
  } finally {
    await loadingTask.destroy();
  }
};
