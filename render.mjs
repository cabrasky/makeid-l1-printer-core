import { createCanvas } from "canvas";
import { registerAllFonts } from "./fonts.mjs";

registerAllFonts();

// Renderizador ÚNICO para preview e impresión. Los números mágicos (dpi,
// márgenes, escala) vienen de la configuración/perfil, no hardcodeados.
// ctx = { dpi, scaleDpi, textMarginPx } (desde config.json + printers/*.json)

export function renderTemplate(tpl, vars, ctx = {}) {
  const dpi = ctx.dpi ?? 203;
  const scaleDpi = ctx.scaleDpi ?? 96;
  const margin = ctx.textMarginPx ?? 8;
  const SCALE = dpi / scaleDpi;

  const bg = tpl.background === "black" ? "#000000" : "#ffffff";
  const ink = tpl.background === "black" ? "#ffffff" : "#000000";
  const dimW = tpl.dimensions?.width ?? 227;
  const dimH = tpl.dimensions?.height ?? 136; // en PÍXELES
  const canvas = createCanvas(dimW, dimH);
  const ctx2d = canvas.getContext("2d");
  ctx2d.fillStyle = bg;
  ctx2d.fillRect(0, 0, dimW, dimH);

  const defaultFamily = tpl.defaultFont?.family ?? "Norwester Condensed";
  const defaultSize = tpl.defaultFont?.size ?? 16;

  // Pass 1: auto-fit text sizes (solo ancho; el alto se controla en la plantilla)
  for (const el of tpl.elements) {
    if (el.type !== "text") continue;
    const text = substitute(el.content, vars);
    const family = el.fontFamily ?? defaultFamily;
    const base = el.fontSize ?? defaultSize;
    const x = Math.round((el.position?.x ?? 0) * SCALE);
    const avail = el.align === "center" ? dimW - 2 * margin : dimW - x - margin;
    const scaled = base * SCALE;
    const width = measure(text, family, scaled, el.weight ?? "normal");
    el._size = width > avail
      ? Math.round(scaled * (avail / width) * 0.97)
      : Math.round(scaled);
  }

  // Pass 2: dibujar
  for (const el of tpl.elements) {
    switch (el.type) {
      case "text": {
        const text = substitute(el.content, vars);
        const family = el.fontFamily ?? defaultFamily;
        const weight = el.weight ?? "normal";
        ctx2d.font = `${weight} ${el._size}px "${family}"`;
        ctx2d.textAlign = el.align || "left";
        ctx2d.fillStyle = ink;
        ctx2d.fillText(
          text,
          Math.round((el.position?.x ?? 0) * SCALE),
          Math.round((el.position?.y ?? 0) * SCALE)
        );
        break;
      }
      case "rectangle": {
        const x = Math.round(el.position.x * SCALE);
        const y = Math.round(el.position.y * SCALE);
        const w = Math.round(el.width * SCALE);
        const h = Math.round(el.height * SCALE);
        if (el.filled) { ctx2d.fillStyle = ink; ctx2d.fillRect(x, y, w, h); }
        else { ctx2d.strokeStyle = ink; ctx2d.lineWidth = el.lineWidth ?? 1; ctx2d.strokeRect(x, y, w, h); }
        break;
      }
      case "line": {
        ctx2d.strokeStyle = ink;
        ctx2d.lineWidth = el.width ?? 1;
        ctx2d.beginPath();
        ctx2d.moveTo(Math.round(el.start.x * SCALE), Math.round(el.start.y * SCALE));
        ctx2d.lineTo(Math.round(el.end.x * SCALE), Math.round(el.end.y * SCALE));
        ctx2d.stroke();
        break;
      }
      case "circle": {
        ctx2d.lineWidth = el.lineWidth ?? 1;
        ctx2d.beginPath();
        ctx2d.arc(
          Math.round(el.center.x * SCALE),
          Math.round(el.center.y * SCALE),
          Math.round(el.radius * SCALE),
          0, 2 * Math.PI
        );
        if (el.filled) { ctx2d.fillStyle = ink; ctx2d.fill(); }
        else { ctx2d.strokeStyle = ink; ctx2d.stroke(); }
        break;
      }
      case "stripes": {
        const b = el.bounds
          ? { x: Math.round(el.bounds.x * SCALE), y: Math.round(el.bounds.y * SCALE),
              w: Math.round(el.bounds.width * SCALE), h: Math.round(el.bounds.height * SCALE) }
          : { x: 0, y: 0, w: dimW, h: dimH };
        const spacing = Math.max(1, Math.round(el.spacing * SCALE));
        const sw = Math.max(1, Math.round(el.width * SCALE));
        ctx2d.fillStyle = ink;
        if (el.direction === "horizontal") {
          for (let y = b.y; y < b.y + b.h; y += spacing)
            ctx2d.fillRect(b.x, y, b.w, Math.min(sw, b.y + b.h - y));
        } else {
          for (let x = b.x; x < b.x + b.w; x += spacing)
            ctx2d.fillRect(x, b.y, Math.min(sw, b.x + b.w - x), b.h);
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
        ctx2d.lineWidth = el.lineWidth ?? 1;
        ctx2d.strokeStyle = el.alpha ? `rgba(0,0,0,${el.alpha})` : ink;
        for (let x = b.x; x <= b.x + b.w; x += cw) { ctx2d.beginPath(); ctx2d.moveTo(x, b.y); ctx2d.lineTo(x, b.y + b.h); ctx2d.stroke(); }
        for (let y = b.y; y <= b.y + b.h; y += ch) { ctx2d.beginPath(); ctx2d.moveTo(b.x, y); ctx2d.lineTo(b.x + b.w, y); ctx2d.stroke(); }
        break;
      }
    }
  }
  return canvas;
}

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

// Convierte el canvas a raster 1-bit según la orientación/orden del perfil:
//   column-major (L1): 1 byte = 8 px verticales; byteOrder topLSB (arriba = bit 0) o topMSB
//   row-major (ESC/POS estándar): cada fila = ceil(w/8) bytes; byteOrder leftLSB (izquierda = bit 0) o leftMSB
export function canvasToImageData(canvas, orientation = "column-major", byteOrder = "topLSB") {
  const { width, height } = canvas;
  const data = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  const ink = (x, y) => (data[(y * width + x) * 4] === 255 ? 0 : 1); // 1 = píxel impreso
  const out = [];

  if (orientation === "column-major") {
    for (let x = 0; x < width; x++) {
      for (let y0 = 0; y0 < height; y0 += 8) {
        let b = 0;
        const n = Math.min(8, height - y0);
        if (byteOrder === "topLSB") {
          for (let j = 0; j < n; j++) b |= ink(x, y0 + j) << j;
        } else {
          for (let j = 0; j < n; j++) b = (b << 1) | ink(x, y0 + j);
          b <<= 8 - n;
        }
        out.push(b & 0xff);
      }
    }
  } else {
    const wb = Math.ceil(width / 8);
    for (let y = 0; y < height; y++) {
      for (let bx = 0; bx < wb; bx++) {
        let b = 0;
        const n = Math.min(8, width - bx * 8);
        if (byteOrder === "leftLSB") {
          for (let j = 0; j < n; j++) b |= ink(bx * 8 + j, y) << j;
        } else {
          for (let j = 0; j < n; j++) b = (b << 1) | ink(bx * 8 + j, y);
          b <<= 8 - n;
        }
        out.push(b & 0xff);
      }
    }
  }
  return out;
}
