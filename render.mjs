import { createCanvas } from "canvas";
import { registerAllFonts } from "./fonts.mjs";

registerAllFonts();

// Renderizador ÚNICO para preview e impresión: lo que ves en el preview es
// EXACTAMENTE lo que se envía a la impresora (mismo código, mismo raster).
export const SCALE = 203 / 96;
export const MARGIN = 8;

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

export function renderTemplate(tpl, vars) {
  const bg = tpl.background === "black" ? "#000000" : "#ffffff";
  const ink = tpl.background === "black" ? "#ffffff" : "#000000";
  const dimW = tpl.dimensions?.width ?? 227;
  const dimH = (tpl.dimensions?.height ?? 17) * 8;
  const canvas = createCanvas(dimW, dimH);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, dimW, dimH);

  const defaultFamily = tpl.defaultFont?.family ?? "Norwester Condensed";
  const defaultSize = tpl.defaultFont?.size ?? 16;

  // Pass 1: auto-fit text sizes (solo ancho; el alto hay que controlarlo en la plantilla)
  for (const el of tpl.elements) {
    if (el.type !== "text") continue;
    const text = substitute(el.content, vars);
    const family = el.fontFamily ?? defaultFamily;
    const base = el.fontSize ?? defaultSize;
    const x = Math.round((el.position?.x ?? 0) * SCALE);
    const avail = el.align === "center" ? dimW - 2 * MARGIN : dimW - x - MARGIN;
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
        ctx.font = `${weight} ${el._size}px "${family}"`;
        ctx.textAlign = el.align || "left";
        ctx.fillStyle = ink;
        ctx.fillText(
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
        if (el.filled) { ctx.fillStyle = ink; ctx.fillRect(x, y, w, h); }
        else { ctx.strokeStyle = ink; ctx.lineWidth = el.lineWidth ?? 1; ctx.strokeRect(x, y, w, h); }
        break;
      }
      case "line": {
        ctx.strokeStyle = ink;
        ctx.lineWidth = el.width ?? 1;
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
        const b = el.bounds
          ? { x: Math.round(el.bounds.x * SCALE), y: Math.round(el.bounds.y * SCALE),
              w: Math.round(el.bounds.width * SCALE), h: Math.round(el.bounds.height * SCALE) }
          : { x: 0, y: 0, w: dimW, h: dimH };
        const spacing = Math.max(1, Math.round(el.spacing * SCALE));
        const sw = Math.max(1, Math.round(el.width * SCALE));
        ctx.fillStyle = ink;
        if (el.direction === "horizontal") {
          for (let y = b.y; y < b.y + b.h; y += spacing)
            ctx.fillRect(b.x, y, b.w, Math.min(sw, b.y + b.h - y));
        } else {
          for (let x = b.x; x < b.x + b.w; x += spacing)
            ctx.fillRect(x, b.y, Math.min(sw, b.x + b.w - x), b.h);
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

// Convierte el canvas al raster column-major del protocolo MakeID
// (1 byte = 8 píxeles verticales; píxel superior = bit 0 — igual que ImageProcessor).
export function canvasToImageData(canvas) {
  const { width, height } = canvas;
  const data = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  const out = [];
  for (let x = 0; x < width; x++) {
    let bits = [];
    for (let y = height - 1; y >= 0; y--) {
      const r = data[(y * width + x) * 4];
      bits.unshift(r === 255 ? 0 : 1);
      if (bits.length === 8) {
        let b = 0;
        for (let i = 0; i < 8; i++) b |= bits[i] << i;
        out.push(b);
        bits = [];
      }
    }
    if (bits.length) {
      let b = 0;
      for (let i = 0; i < bits.length; i++) b |= bits[i] << i;
      out.push(b);
    }
  }
  return out;
}
