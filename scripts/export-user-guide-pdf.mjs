#!/usr/bin/env node
/**
 * Export each user guide in docs/user-guide/ to a PDF in docs/user-guide/pdf/
 * (same engine as npm run specs:pdf). The README is for maintainers and is skipped.
 *
 * Usage:
 *   npm run user-guide:pdf
 *   node scripts/export-user-guide-pdf.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mdToPdf } from "md-mermaid-pdf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const guideDir = join(rootDir, "docs", "user-guide");
const pdfDir = join(guideDir, "pdf");

const SYSTEM_CHROME_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    : null,
  process.env.PROGRAMFILES
    ? `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`
    : null,
  process.env["PROGRAMFILES(X86)"]
    ? `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`
    : null,
  process.env.PROGRAMFILES
    ? `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`
    : null,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function resolveChromeExecutable() {
  return SYSTEM_CHROME_PATHS.find((candidate) => existsSync(candidate));
}

function getLaunchOptions() {
  const executablePath = resolveChromeExecutable();
  return executablePath ? { executablePath } : {};
}

function installPuppeteerChrome() {
  console.log("Installing Puppeteer Chrome (one-time download)...");
  execSync("npx puppeteer browsers install chrome", { cwd: rootDir, stdio: "inherit" });
}

async function renderPdf(markdown, pdfPath) {
  const config = {
    dest: pdfPath,
    basedir: guideDir,
    pdf_options: { format: "Letter", margin: "20mm", printBackground: true },
    launch_options: getLaunchOptions(),
    mermaidSource: "bundled",
  };

  try {
    return await mdToPdf({ content: markdown }, config);
  } catch (error) {
    const chromeMissing = String(error?.message ?? error).includes("Could not find Chrome");
    if (!chromeMissing || resolveChromeExecutable()) throw error;
    installPuppeteerChrome();
    return mdToPdf({ content: markdown }, { ...config, launch_options: getLaunchOptions() });
  }
}

async function main() {
  const guides = readdirSync(guideDir)
    .filter((name) => name.toLowerCase().endsWith(".md") && name.toLowerCase() !== "readme.md")
    .sort();
  if (!guides.length) throw new Error(`No user guides found in ${guideDir}`);

  mkdirSync(pdfDir, { recursive: true });
  for (const name of guides) {
    const pdfPath = join(pdfDir, `${basename(name, ".md")}.pdf`);
    const pdf = await renderPdf(readFileSync(join(guideDir, name), "utf8"), pdfPath);
    if (!pdf) throw new Error(`PDF generation failed for ${name}`);
    if (!existsSync(pdfPath) && Buffer.isBuffer(pdf)) writeFileSync(pdfPath, pdf);
    console.log(`Wrote ${pdfPath}`);
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
