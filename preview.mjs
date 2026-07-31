import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderTemplate } from "./render.mjs";
import { loadConfig, loadProfile } from "./protocol.mjs";

// Usage: node preview.mjs <template.json> <line1> <line2> [out.png]
// Mismo renderizador que print-usb.mjs -> preview fiel a la impresión.
const args = process.argv.slice(2);
const templateFile = args[0] ?? "./templates/backups-term-vt323.json";
const line1 = args[1] ?? "BACKUPS";
const line2 = args[2] ?? "USB STORAGE";
const outFile = args[3] ?? path.join(process.cwd(), "preview.png");

const cfg = loadConfig();
const profile = loadProfile(cfg.printer);
const renderCtx = {
  dpi: profile.dpi,
  scaleDpi: cfg.render?.scaleDpi ?? 96,
  textMarginPx: cfg.render?.textMarginPx ?? 8,
};

const template = JSON.parse(readFileSync(templateFile, "utf8"));
const canvas = renderTemplate(template, { line1, line2 }, renderCtx);

writeFileSync(outFile, canvas.toBuffer("image/png"));
console.log(`preview -> ${outFile} (${canvas.width}x${canvas.height}) | printer: ${profile.name}`);
