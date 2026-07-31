import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderTemplate } from "./render.mjs";

// Usage: node preview.mjs <template.json> <line1> <line2> [out.png]
// Mismo renderizador que print-usb.mjs -> preview fiel a la impresión.
const args = process.argv.slice(2);
const templateFile = args[0] ?? "./templates/backups-label.json";
const line1 = args[1] ?? "BACKUPS";
const line2 = args[2] ?? "USB STORAGE";
const outFile = args[3] ?? path.join(process.cwd(), "preview.png");

const template = JSON.parse(readFileSync(templateFile, "utf8"));
const canvas = renderTemplate(template, { line1, line2 });

writeFileSync(outFile, canvas.toBuffer("image/png"));
console.log(`preview -> ${outFile} (${canvas.width}x${canvas.height})`);
