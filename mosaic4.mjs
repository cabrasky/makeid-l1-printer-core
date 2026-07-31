import { writeFileSync } from "node:fs";
import path from "node:path";
import { createCanvas } from "canvas";
import { registerAllFonts } from "./fonts.mjs";

registerAllFonts();

const SCALE = 203 / 96;
const MARGIN = 8;
const W = 227, H = 136;

const substitute = (content, vars) =>
  Object.entries(vars).reduce(
    (r, [k, v]) => r.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
    content
  );

const measure = (text, family, px, weight = "normal") => {
  const c = createCanvas(4, 4);
  const x = c.getContext("2d");
  x.font = `${weight} ${px}px "${family}"`;
  return x.measureText(text).width;
};

// Design #4 layout, font injected per cell
function render4(family, weight = "normal") {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const drawText = (text, size, y, align = "left", xPos = 6) => {
    const avail = align === "center" ? W - 2 * MARGIN : W - Math.round(xPos * SCALE) - MARGIN;
    let s = Math.round(size * SCALE);
    const w = measure(text, family, s, weight);
    if (w > avail) s = Math.round(s * (avail / w) * 0.97);
    ctx.font = `${weight} ${s}px "${family}"`;
    ctx.textAlign = align;
    ctx.fillStyle = "#000000";
    ctx.fillText(text, Math.round(xPos * SCALE), Math.round(y * SCALE));
  };

  // grid bg
  const cw = Math.round(13 * SCALE), ch = Math.round(13 * SCALE);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += cw) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += ch) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  drawText("> BACKUPS_", 22, 30);
  drawText("USB STORAGE", 12, 48);
  return canvas;
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
console.log(`mosaic4 -> ./backups-fonts-mosaic.png (${MW}x${MH})`);
for (const [label] of fonts) console.log(" -", label);
