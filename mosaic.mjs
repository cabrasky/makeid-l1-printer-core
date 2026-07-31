import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createCanvas } from "canvas";
import { registerAllFonts } from "./fonts.mjs";

registerAllFonts();

const SCALE = 203 / 96;
const MARGIN = 8;
const W = 227;
const H = 136;

const F = {
  saira: "Saira Stencil One",
  stardos: "Stardos Stencil",
  norwester: "Norwester Condensed",
  mono: "DejaVu Sans Mono",
  sansBold: "DejaVu Sans",
  monoBold: "DejaVu Sans Mono",
};

const substitute = (content, vars) =>
  Object.entries(vars).reduce(
    (r, [k, v]) => r.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
    content
  );

const measure = (text, family, px) => {
  const c = createCanvas(4, 4);
  const x = c.getContext("2d");
  x.font = `${px}px "${family}" normal`;
  return x.measureText(text).width;
};

function render(tpl, vars) {
  const bg = tpl.background === "black" ? "#000000" : "#ffffff";
  const ink = tpl.background === "black" ? "#ffffff" : "#000000";
  const dimW = tpl.dimensions?.width ?? W;
  const dimH = (tpl.dimensions?.height ?? 17) * 8;
  const canvas = createCanvas(dimW, dimH);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, dimW, dimH);

  const defaultFamily = tpl.defaultFont?.family ?? F.norwester;
  const defaultSize = tpl.defaultFont?.size ?? 16;

  // Pass 1: auto-fit text sizes
  for (const el of tpl.elements) {
    if (el.type !== "text") continue;
    const text = substitute(el.content, vars);
    const family = el.fontFamily ?? defaultFamily;
    const base = el.fontSize ?? defaultSize;
    const x = Math.round((el.position?.x ?? 0) * SCALE);
    const avail = el.align === "center" ? dimW - 2 * MARGIN : dimW - x - MARGIN;
    const scaled = base * SCALE;
    const width = measure(text, family, scaled);
    el._size = width > avail ? Math.round((scaled * (avail / width) * 0.97)) : Math.round(scaled);
  }

  // Pass 2: draw
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  for (const el of tpl.elements) {
    switch (el.type) {
      case "text": {
        const text = substitute(el.content, vars);
        const family = el.fontFamily ?? defaultFamily;
        ctx.font = `${el._size}px "${family}" normal`;
        ctx.textAlign = el.align || "left";
        ctx.fillStyle = ink;
        ctx.fillText(text, Math.round((el.position?.x ?? 0) * SCALE), Math.round((el.position?.y ?? 0) * SCALE));
        break;
      }
      case "rectangle": {
        ctx.lineWidth = el.lineWidth ?? 1;
        const x = Math.round(el.position.x * SCALE);
        const y = Math.round(el.position.y * SCALE);
        const w = Math.round(el.width * SCALE);
        const h = Math.round(el.height * SCALE);
        if (el.filled) { ctx.fillStyle = ink; ctx.fillRect(x, y, w, h); }
        else { ctx.strokeStyle = ink; ctx.strokeRect(x, y, w, h); }
        break;
      }
      case "line": {
        ctx.lineWidth = el.width ?? 1;
        ctx.strokeStyle = ink;
        ctx.beginPath();
        ctx.moveTo(Math.round(el.start.x * SCALE), Math.round(el.start.y * SCALE));
        ctx.lineTo(Math.round(el.end.x * SCALE), Math.round(el.end.y * SCALE));
        ctx.stroke();
        break;
      }
      case "circle": {
        ctx.lineWidth = el.lineWidth ?? 1;
        ctx.beginPath();
        ctx.arc(
          Math.round(el.center.x * SCALE),
          Math.round(el.center.y * SCALE),
          Math.round(el.radius * SCALE),
          0, 2 * Math.PI
        );
        if (el.filled) { ctx.fillStyle = ink; ctx.fill(); }
        else { ctx.strokeStyle = ink; ctx.stroke(); }
        break;
      }
      case "stripes": {
        const bounds = el.bounds
          ? { x: Math.round(el.bounds.x * SCALE), y: Math.round(el.bounds.y * SCALE),
              w: Math.round(el.bounds.width * SCALE), h: Math.round(el.bounds.height * SCALE) }
          : { x: 0, y: 0, w: dimW, h: dimH };
        const spacing = Math.max(1, Math.round(el.spacing * SCALE));
        const sw = Math.max(1, Math.round(el.width * SCALE));
        ctx.fillStyle = ink;
        if (el.direction === "horizontal") {
          for (let y = bounds.y; y < bounds.y + bounds.h; y += spacing)
            ctx.fillRect(bounds.x, y, bounds.w, Math.min(sw, bounds.y + bounds.h - y));
        } else {
          for (let x = bounds.x; x < bounds.x + bounds.w; x += spacing)
            ctx.fillRect(x, bounds.y, Math.min(sw, bounds.x + bounds.w - x), bounds.h);
        }
        break;
      }
      case "grid": {
        const b = el.bounds
          ? { x: Math.round(el.bounds.x * SCALE), y: Math.round(el.bounds.y * SCALE),
              w: Math.round(el.bounds.width * SCALE), h: Math.round(el.bounds.height * SCALE) }
          : { x: 0, y: 0, w: dimW, h: dimH };
        const cw = Math.round(el.cellWidth * SCALE);
        const ch = Math.round(el.cellHeight * SCALE);
        ctx.lineWidth = el.lineWidth ?? 1;
        ctx.strokeStyle = el.alpha ? `rgba(0,0,0,${el.alpha})` : ink;
        for (let x = b.x; x <= b.x + b.w; x += cw) { ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke(); }
        for (let y = b.y; y <= b.y + b.h; y += ch) { ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); }
        break;
      }
    }
  }
  return canvas;
}

// ---------------------------------------------------------------- designs
const L1 = "BACKUPS";
const L2 = "USB STORAGE";
const designs = [
  { name: "1 · Stencil borde", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "rectangle", position: { x: 2, y: 2 }, width: 103, height: 60 },
      { type: "text", content: "{{l1}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 34 }, align: "center" },
    ] },
  { name: "2 · Stencil limpio", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "{{l1}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 34 }, align: "center" },
    ] },
  { name: "3 · Stardos doble borde", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.stardos, size: 26 },
    elements: [
      { type: "rectangle", position: { x: 1, y: 1 }, width: 105, height: 62 },
      { type: "rectangle", position: { x: 4, y: 4 }, width: 99, height: 56 },
      { type: "text", content: "{{l1}}", fontSize: 26, fontFamily: F.stardos, position: { x: 54, y: 36 }, align: "center" },
    ] },
  { name: "4 · Terminal prompt", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.mono, size: 22 },
    elements: [
      { type: "grid", bounds: { x: 0, y: 0, width: 107, height: 64 }, cellWidth: 13, cellHeight: 13, alpha: 0.12 },
      { type: "text", content: "> {{l1}}_", fontSize: 22, fontFamily: F.mono, position: { x: 6, y: 30 }, align: "left" },
      { type: "text", content: "{{l2}}", fontSize: 12, fontFamily: F.mono, position: { x: 6, y: 48 }, align: "left" },
    ] },
  { name: "5 · Apilado stencil", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "{{l1}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 28 }, align: "center" },
      { type: "text", content: "{{l2}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 56 }, align: "center" },
    ] },
  { name: "6 · Apilado Stardos", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.stardos, size: 30 },
    elements: [
      { type: "text", content: "{{l1}}", fontSize: 30, fontFamily: F.stardos, position: { x: 54, y: 28 }, align: "center" },
      { type: "text", content: "{{l2}}", fontSize: 30, fontFamily: F.stardos, position: { x: 54, y: 56 }, align: "center" },
    ] },
  { name: "7 · Invertido stencil", background: "black", dimensions: { width: W, height: 17 }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "{{l1}}", fontSize: 30, fontFamily: F.saira, position: { x: 54, y: 32 }, align: "center" },
      { type: "text", content: "{{l2}}", fontSize: 14, fontFamily: F.mono, position: { x: 54, y: 52 }, align: "center" },
    ] },
  { name: "8 · Terminal invertido", background: "black", dimensions: { width: W, height: 17 }, defaultFont: { family: F.mono, size: 22 },
    elements: [
      { type: "text", content: ">> {{l1}}", fontSize: 24, fontFamily: F.mono, position: { x: 6, y: 28 }, align: "left" },
      { type: "text", content: "{{l2}} v1.0", fontSize: 13, fontFamily: F.mono, position: { x: 6, y: 50 }, align: "left" },
    ] },
  { name: "9 · Franjas + stencil", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "stripes", direction: "horizontal", bounds: { x: 0, y: 0, width: 107, height: 8 }, spacing: 6, width: 3 },
      { type: "stripes", direction: "horizontal", bounds: { x: 0, y: 56, width: 107, height: 8 }, spacing: 6, width: 3 },
      { type: "text", content: "{{l1}}", fontSize: 28, fontFamily: F.saira, position: { x: 54, y: 36 }, align: "center" },
    ] },
  { name: "10 · Código de barras", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.monoBold, size: 24 },
    elements: [
      { type: "text", content: "{{l1}}", fontSize: 24, fontFamily: F.monoBold, position: { x: 54, y: 28 }, align: "center" },
      { type: "stripes", direction: "vertical", bounds: { x: 6, y: 38, width: 96, height: 18 }, spacing: 5, width: 2 },
    ] },
  { name: "11 · USB + BACKUPS", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "▸ {{l2}} ◂", fontSize: 14, fontFamily: F.mono, position: { x: 54, y: 20 }, align: "center" },
      { type: "text", content: "{{l1}}", fontSize: 34, fontFamily: F.saira, position: { x: 54, y: 44 }, align: "center" },
    ] },
  { name: "12 · Sello circular", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.stardos, size: 30 },
    elements: [
      { type: "circle", center: { x: 54, y: 32 }, radius: 27, lineWidth: 3 },
      { type: "text", content: "{{l1}}", fontSize: 22, fontFamily: F.stardos, position: { x: 54, y: 36 }, align: "center" },
    ] },
  { name: "13 · Esquinas marcadas", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.stardos, size: 30 },
    elements: [
      { type: "line", start: { x: 2, y: 2 }, end: { x: 14, y: 2 }, width: 3 },
      { type: "line", start: { x: 2, y: 2 }, end: { x: 2, y: 14 }, width: 3 },
      { type: "line", start: { x: 105, y: 2 }, end: { x: 93, y: 2 }, width: 3 },
      { type: "line", start: { x: 105, y: 2 }, end: { x: 105, y: 14 }, width: 3 },
      { type: "line", start: { x: 2, y: 62 }, end: { x: 14, y: 62 }, width: 3 },
      { type: "line", start: { x: 2, y: 62 }, end: { x: 2, y: 50 }, width: 3 },
      { type: "line", start: { x: 105, y: 62 }, end: { x: 93, y: 62 }, width: 3 },
      { type: "line", start: { x: 105, y: 62 }, end: { x: 105, y: 50 }, width: 3 },
      { type: "text", content: "{{l1}}", fontSize: 26, fontFamily: F.stardos, position: { x: 54, y: 38 }, align: "center" },
    ] },
  { name: "14 · Subrayado acento", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "text", content: "{{l1}}", fontSize: 32, fontFamily: F.saira, position: { x: 54, y: 30 }, align: "center" },
      { type: "line", start: { x: 10, y: 36 }, end: { x: 98, y: 36 }, width: 4 },
      { type: "text", content: "{{l2}}", fontSize: 12, fontFamily: F.mono, position: { x: 54, y: 52 }, align: "center" },
    ] },
  { name: "15 · Formulario mono", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.monoBold, size: 30 },
    elements: [
      { type: "line", start: { x: 4, y: 8 }, end: { x: 103, y: 8 }, width: 3 },
      { type: "text", content: "{{l1}}", fontSize: 28, fontFamily: F.monoBold, position: { x: 54, y: 32 }, align: "center" },
      { type: "line", start: { x: 4, y: 46 }, end: { x: 103, y: 46 }, width: 3 },
      { type: "text", content: "{{l2}}", fontSize: 12, fontFamily: F.mono, position: { x: 54, y: 58 }, align: "center" },
    ] },
  { name: "16 · Rejilla + stencil", background: "white", dimensions: { width: W, height: 17 }, defaultFont: { family: F.saira, size: 30 },
    elements: [
      { type: "grid", bounds: { x: 0, y: 0, width: 107, height: 64 }, cellWidth: 9, cellHeight: 9, alpha: 0.10 },
      { type: "text", content: "{{l1}}", fontSize: 34, fontFamily: F.saira, position: { x: 54, y: 34 }, align: "center" },
      { type: "text", content: "v2.0", fontSize: 11, fontFamily: F.mono, position: { x: 96, y: 58 }, align: "right" },
    ] },
];

// ---------------------------------------------------------------- mosaic
const CELL_W = W * 2, CELL_H = H * 2, GAP = 18, PAD = 24;
const cols = 4, rows = 4;
const MW = PAD * 2 + cols * CELL_W + (cols - 1) * GAP;
const MH = PAD * 2 + rows * CELL_H + (rows - 1) * GAP + 40;
const mosaic = createCanvas(MW, MH);
const mctx = mosaic.getContext("2d");
mctx.fillStyle = "#f2f2f2";
mctx.fillRect(0, 0, MW, MH);

designs.forEach((d, i) => {
  const c = render({ ...d, dimensions: { width: W, height: 17 } }, { l1: L1, l2: L2 });
  const col = i % cols, row = Math.floor(i / cols);
  const x = PAD + col * (CELL_W + GAP);
  const y = PAD + row * (CELL_H + GAP);
  mctx.fillStyle = "#ffffff";
  mctx.fillRect(x, y, CELL_W, CELL_H);
  mctx.drawImage(c, x, y, CELL_W, CELL_H);
  // badge
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
console.log(`mosaic -> ./backups-mosaic.png (${MW}x${MH})`);
for (const d of designs) console.log(" -", d.name);
