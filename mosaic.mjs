import { writeFileSync } from "node:fs";
import path from "node:path";
import { createCanvas } from "canvas";
import { renderTemplate } from "./render.mjs";
import { loadConfig, loadProfile } from "./protocol.mjs";

// Mosaico 4x4 con 16 diseños de etiqueta para elegir. Usa el MISMO renderizador
// que la impresión (render.mjs) y la config/perfil activos.
const cfg = loadConfig();
const profile = loadProfile(cfg.printer);
const renderCtx = {
  dpi: profile.dpi,
  scaleDpi: cfg.render?.scaleDpi ?? 96,
  textMarginPx: cfg.render?.textMarginPx ?? 8,
};

const W = 227, H = 136;
const L1 = "BACKUPS";
const L2 = "USB STORAGE";

const F = {
  saira: "Saira Stencil One",
  stardos: "Stardos Stencil",
  norwester: "Norwester Condensed",
  mono: "DejaVu Sans Mono",
  sansBold: "DejaVu Sans",
  monoBold: "DejaVu Sans Mono",
};

const designs = [
  { name: "1 · Stencil borde", dimensions: { width: W, height: H }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "rectangle", position: { x: 2, y: 2 }, width: 103, height: 60 },
      { type: "text", content: "{{line1}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 34 }, align: "center" },
    ] },
  { name: "2 · Stencil limpio", dimensions: { width: W, height: H }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "{{line1}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 34 }, align: "center" },
    ] },
  { name: "3 · Stardos doble borde", dimensions: { width: W, height: H }, defaultFont: { family: F.stardos, size: 26 },
    elements: [
      { type: "rectangle", position: { x: 1, y: 1 }, width: 105, height: 62 },
      { type: "rectangle", position: { x: 4, y: 4 }, width: 99, height: 56 },
      { type: "text", content: "{{line1}}", fontSize: 26, fontFamily: F.stardos, position: { x: 54, y: 36 }, align: "center" },
    ] },
  { name: "4 · Terminal prompt", dimensions: { width: W, height: H }, defaultFont: { family: F.mono, size: 22 },
    elements: [
      { type: "grid", bounds: { x: 0, y: 0, width: 107, height: 64 }, cellWidth: 13, cellHeight: 13, alpha: 0.12 },
      { type: "text", content: "> {{line1}}_", fontSize: 22, fontFamily: F.mono, position: { x: 6, y: 30 }, align: "left" },
      { type: "text", content: "{{line2}}", fontSize: 12, fontFamily: F.mono, position: { x: 6, y: 48 }, align: "left" },
    ] },
  { name: "5 · Apilado stencil", dimensions: { width: W, height: H }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "{{line1}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 28 }, align: "center" },
      { type: "text", content: "{{line2}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 56 }, align: "center" },
    ] },
  { name: "6 · Apilado Stardos", dimensions: { width: W, height: H }, defaultFont: { family: F.stardos, size: 30 },
    elements: [
      { type: "text", content: "{{line1}}", fontSize: 30, fontFamily: F.stardos, position: { x: 54, y: 28 }, align: "center" },
      { type: "text", content: "{{line2}}", fontSize: 30, fontFamily: F.stardos, position: { x: 54, y: 56 }, align: "center" },
    ] },
  { name: "7 · Invertido stencil", background: "black", dimensions: { width: W, height: H }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "{{line1}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 32 }, align: "center" },
      { type: "text", content: "{{line2}}", fontSize: 14, fontFamily: F.mono, position: { x: 54, y: 52 }, align: "center" },
    ] },
  { name: "8 · Terminal invertido", background: "black", dimensions: { width: W, height: H }, defaultFont: { family: F.mono, size: 22 },
    elements: [
      { type: "text", content: ">> {{line1}}", fontSize: 24, fontFamily: F.mono, position: { x: 6, y: 28 }, align: "left" },
      { type: "text", content: "{{line2}} v1.0", fontSize: 13, fontFamily: F.mono, position: { x: 6, y: 50 }, align: "left" },
    ] },
  { name: "9 · Franjas + stencil", dimensions: { width: W, height: H }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "stripes", direction: "horizontal", bounds: { x: 0, y: 0, width: 107, height: 8 }, spacing: 6, width: 3 },
      { type: "stripes", direction: "horizontal", bounds: { x: 0, y: 56, width: 107, height: 8 }, spacing: 6, width: 3 },
      { type: "text", content: "{{line1}}", fontSize: 28, fontFamily: F.saira, position: { x: 54, y: 36 }, align: "center" },
    ] },
  { name: "10 · Código de barras", dimensions: { width: W, height: H }, defaultFont: { family: F.monoBold, size: 24 },
    elements: [
      { type: "text", content: "{{line1}}", fontSize: 24, fontFamily: F.monoBold, position: { x: 54, y: 28 }, align: "center" },
      { type: "stripes", direction: "vertical", bounds: { x: 6, y: 38, width: 96, height: 18 }, spacing: 5, width: 2 },
    ] },
  { name: "11 · USB + BACKUPS", dimensions: { width: W, height: H }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "▸ {{line2}} ◂", fontSize: 14, fontFamily: F.mono, position: { x: 54, y: 20 }, align: "center" },
      { type: "text", content: "{{line1}}", fontSize: 34, fontFamily: F.saira, position: { x: 54, y: 44 }, align: "center" },
    ] },
  { name: "12 · Sello circular", dimensions: { width: W, height: H }, defaultFont: { family: F.stardos, size: 30 },
    elements: [
      { type: "circle", center: { x: 54, y: 32 }, radius: 27, lineWidth: 3 },
      { type: "text", content: "{{line1}}", fontSize: 22, fontFamily: F.stardos, position: { x: 54, y: 36 }, align: "center" },
    ] },
  { name: "13 · Esquinas marcadas", dimensions: { width: W, height: H }, defaultFont: { family: F.stardos, size: 30 },
    elements: [
      { type: "line", start: { x: 2, y: 2 }, end: { x: 14, y: 2 }, width: 3 },
      { type: "line", start: { x: 2, y: 2 }, end: { x: 2, y: 14 }, width: 3 },
      { type: "line", start: { x: 105, y: 2 }, end: { x: 93, y: 2 }, width: 3 },
      { type: "line", start: { x: 105, y: 2 }, end: { x: 105, y: 14 }, width: 3 },
      { type: "line", start: { x: 2, y: 62 }, end: { x: 14, y: 62 }, width: 3 },
      { type: "line", start: { x: 2, y: 62 }, end: { x: 2, y: 50 }, width: 3 },
      { type: "line", start: { x: 105, y: 62 }, end: { x: 93, y: 62 }, width: 3 },
      { type: "line", start: { x: 105, y: 62 }, end: { x: 105, y: 50 }, width: 3 },
      { type: "text", content: "{{line1}}", fontSize: 26, fontFamily: F.stardos, position: { x: 54, y: 38 }, align: "center" },
    ] },
  { name: "14 · Subrayado acento", dimensions: { width: W, height: H }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "{{line1}}", fontSize: 32, fontFamily: F.saira, position: { x: 54, y: 30 }, align: "center" },
      { type: "line", start: { x: 10, y: 36 }, end: { x: 98, y: 36 }, width: 4 },
      { type: "text", content: "{{line2}}", fontSize: 12, fontFamily: F.mono, position: { x: 54, y: 52 }, align: "center" },
    ] },
  { name: "15 · Formulario mono", dimensions: { width: W, height: H }, defaultFont: { family: F.monoBold, size: 30 },
    elements: [
      { type: "line", start: { x: 4, y: 8 }, end: { x: 103, y: 8 }, width: 3 },
      { type: "text", content: "{{line1}}", fontSize: 28, fontFamily: F.monoBold, position: { x: 54, y: 32 }, align: "center" },
      { type: "line", start: { x: 4, y: 46 }, end: { x: 103, y: 46 }, width: 3 },
      { type: "text", content: "{{line2}}", fontSize: 12, fontFamily: F.mono, position: { x: 54, y: 58 }, align: "center" },
    ] },
  { name: "16 · Rejilla + stencil", dimensions: { width: W, height: H }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "grid", bounds: { x: 0, y: 0, width: 107, height: 64 }, cellWidth: 9, cellHeight: 9, alpha: 0.10 },
      { type: "text", content: "{{line1}}", fontSize: 34, fontFamily: F.saira, position: { x: 54, y: 34 }, align: "center" },
      { type: "text", content: "v2.0", fontSize: 11, fontFamily: F.mono, position: { x: 96, y: 58 }, align: "right" },
    ] },
];

// --- Mosaico ----------------------------------------------------------------
const CELL_W = W * 2, CELL_H = H * 2, GAP = 18, PAD = 24;
const cols = 4, rows = 4;
const MW = PAD * 2 + cols * CELL_W + (cols - 1) * GAP;
const MH = PAD * 2 + rows * CELL_H + (rows - 1) * GAP + 40;
const mosaic = createCanvas(MW, MH);
const mctx = mosaic.getContext("2d");
mctx.fillStyle = "#f2f2f2";
mctx.fillRect(0, 0, MW, MH);

designs.forEach((d, i) => {
  const c = renderTemplate(d, { line1: L1, line2: L2 }, renderCtx);
  const col = i % cols, row = Math.floor(i / cols);
  const x = PAD + col * (CELL_W + GAP);
  const y = PAD + row * (CELL_H + GAP);
  mctx.fillStyle = "#ffffff";
  mctx.fillRect(x, y, CELL_W, CELL_H);
  mctx.drawImage(c, x, y, CELL_W, CELL_H);
  mctx.fillStyle = "#111111";
  mctx.beginPath();
  mctx.roundRect(x + 8, y + 8, 44, 30, 6);
  mctx.fill();
  mctx.fillStyle = "#ffffff";
  mctx.font = 'bold 22px "DejaVu Sans Mono"';
  mctx.textAlign = "center";
  mctx.textBaseline = "middle";
  mctx.fillText(String(i + 1), x + 30, y + 24);
  mctx.textBaseline = "alphabetic";
});

writeFileSync(path.join(process.cwd(), "backups-mosaic.png"), mosaic.toBuffer("image/png"));
console.log(`mosaic -> ./backups-mosaic.png (${MW}x${MH}) | printer: ${profile.name}`);
for (const d of designs) console.log(" -", d.name);
