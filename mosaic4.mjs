import { writeFileSync } from "node:fs";
import path from "node:path";
import { createCanvas } from "canvas";
import { renderTemplate } from "./render.mjs";
import { loadConfig, loadProfile } from "./protocol.mjs";

// Sampler de tipografías sobre el layout "terminal" (diseño 4 del mosaico).
// Usa el MISMO renderizador que la impresión (render.mjs).
const cfg = loadConfig();
const profile = loadProfile(cfg.printer);
const renderCtx = {
  dpi: profile.dpi,
  scaleDpi: cfg.render?.scaleDpi ?? 96,
  textMarginPx: cfg.render?.textMarginPx ?? 8,
};

const W = 227, H = 136;

function render4(family, weight = "normal") {
  const tpl = {
    dimensions: { width: W, height: H },
    defaultFont: { family: "Norwester Condensed", size: 22 },
    elements: [
      { type: "grid", bounds: { x: 0, y: 0, width: 107, height: 64 }, cellWidth: 13, cellHeight: 13, alpha: 0.12 },
      { type: "text", content: "> {{line1}}_", fontSize: 22, fontFamily: family, weight, position: { x: 6, y: 30 }, align: "left" },
      { type: "text", content: "{{line2}}", fontSize: 12, fontFamily: family, weight, position: { x: 6, y: 48 }, align: "left" },
    ],
  };
  return renderTemplate(tpl, { line1: "BACKUPS", line2: "USB STORAGE" }, renderCtx);
}

const fonts = [
  ["1 · DejaVu Sans Mono", "DejaVu Sans Mono"],
  ["2 · Share Tech Mono", "Share Tech Mono"],
  ["3 · VT323", "VT323"],
  ["4 · Audiowide", "Audiowide"],
  ["5 · Rajdhani Bold", "Rajdhani", "bold"],
  ["6 · Liberation Mono", "Liberation Mono"],
  ["7 · FreeMono", "FreeMono"],
  ["8 · Saira Stencil One", "Saira Stencil One"],
  ["9 · Stardos Stencil", "Stardos Stencil"],
  ["10 · Norwester Condensed", "Norwester Condensed"],
  ["11 · DejaVu Sans Bold", "DejaVu Sans", "bold"],
  ["12 · FreeSans Bold", "FreeSans", "bold"],
  ["13 · DejaVu Serif", "DejaVu Serif"],
  ["14 · DejaVu Mono Bold", "DejaVu Sans Mono", "bold"],
  ["15 · Liberation Sans Bold", "Liberation Sans", "bold"],
  ["16 · FreeSerif", "FreeSerif"],
];

const CELL_W = W * 2, CELL_H = H * 2, GAP = 18, PAD = 24, CAP = 26;
const cols = 4, rows = 4;
const MW = PAD * 2 + cols * CELL_W + (cols - 1) * GAP;
const MH = PAD * 2 + rows * (CELL_H + CAP) + (rows - 1) * GAP;
const mosaic = createCanvas(MW, MH);
const mctx = mosaic.getContext("2d");
mctx.fillStyle = "#f2f2f2";
mctx.fillRect(0, 0, MW, MH);

fonts.forEach(([label, family, weight], i) => {
  const c = render4(family, weight);
  const col = i % cols, row = Math.floor(i / cols);
  const x = PAD + col * (CELL_W + GAP);
  const y = PAD + row * (CELL_H + CAP + GAP);
  mctx.fillStyle = "#ffffff";
  mctx.fillRect(x, y, CELL_W, CELL_H);
  mctx.drawImage(c, x, y, CELL_W, CELL_H);
  mctx.fillStyle = "#333333";
  mctx.font = '16px "DejaVu Sans Mono"';
  mctx.textAlign = "left";
  mctx.fillText(label, x + 4, y + CELL_H + 18);
});

writeFileSync(path.join(process.cwd(), "backups-fonts-mosaic.png"), mosaic.toBuffer("image/png"));
console.log(`mosaic4 -> ./backups-fonts-mosaic.png (${MW}x${MH}) | printer: ${profile.name}`);
for (const [label] of fonts) console.log(" -", label);
