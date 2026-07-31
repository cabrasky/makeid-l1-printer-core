import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { renderTemplate, canvasToImageData } from "./render.mjs";
import { loadConfig, loadProfile, buildPayload } from "./protocol.mjs";

// Uso: sudo node print-usb.mjs [template.json] [line1] [line2] [--dry-run]
// Todo configurable: printers/*.json (perfil de impresora), config.json
// (impresora activa, dispositivo, tipo de papel), env PRINTER_DEVICE/PRINTER_CONFIG.

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const positional = args.filter((a) => a !== "--dry-run");
const templateFile = positional[0] ?? "./templates/backups-term-vt323.json";
const line1 = positional[1] ?? "BACKUPS";
const line2 = positional[2] ?? "USB STORAGE";

// --- Configuración y perfil -------------------------------------------------
const cfg = loadConfig();
const profile = loadProfile(cfg.printer);

const device =
  process.env.PRINTER_DEVICE ??
  cfg.device ??
  profile.connection.defaultDevice[process.platform] ??
  "/dev/usb/lp0";

const mediaType = cfg.media?.type ?? profile.media.defaultType; // diecut | continuous
if (!profile.media.paperTypes.includes(mediaType)) {
  throw new Error(`Tipo de papel "${mediaType}" no soportado por ${profile.name} (${profile.media.paperTypes.join(", ")})`);
}

// --- Plantilla ---------------------------------------------------------------
const tpl = JSON.parse(readFileSync(templateFile, "utf8"));
const tplW = tpl.dimensions?.width ?? 227;
const tplH = tpl.dimensions?.height ?? 136;

// Validación de límites del firmware
const maxW = profile.limits.maxWidthPx;
if (maxW && tplW > maxW) {
  throw new Error(`Ancho ${tplW}px excede el máximo del ${profile.name} (${maxW}px) — papel en blanco`);
}

// --- Tipo de papel -----------------------------------------------------------
// diecut (precortado): la altura del raster debe ser la de la etiqueta para que
//   el sensor de huecos alinee bien; si la plantilla es más baja se rellena.
// continuous (rollo continuo): la altura la define el contenido; se añade
//   alimentación extra configurable al final.
let canvasH = tplH;
let feedAfterDots = 0;
if (mediaType === "diecut") {
  const labelH = cfg.media?.label?.heightPx ?? profile.media.diecut.labelHeightPx;
  const labelW = cfg.media?.label?.widthPx ?? profile.media.diecut.labelWidthPx;
  if (tplH > labelH) {
    throw new Error(`Plantilla ${tplH}px > etiqueta precortada ${labelH}px (${profile.name}) — se saldría de la etiqueta`);
  }
  if (tplH < labelH) {
    console.warn(`[media] plantilla ${tplH}px < etiqueta ${labelH}px: se rellena hasta la altura de la etiqueta`);
    canvasH = labelH;
  }
  if (tplW !== labelW) console.warn(`[media] ancho ${tplW}px != etiqueta ${labelW}px: el raster se imprime desde el borde izquierdo`);
} else {
  feedAfterDots = cfg.media?.feedAfterDots ?? profile.media.continuous.feedAfterDots ?? 0;
}

// --- Render + raster + payload ----------------------------------------------
const renderCtx = {
  dpi: profile.dpi,
  scaleDpi: cfg.render?.scaleDpi ?? 96,
  textMarginPx: cfg.render?.textMarginPx ?? 8,
};
const canvas = renderTemplate({ ...tpl, dimensions: { width: tplW, height: canvasH } }, { line1, line2 }, renderCtx);
const raster = canvasToImageData(canvas, profile.raster.orientation, profile.raster.byteOrder);
const payload = buildPayload(profile, raster, canvas.width, canvas.height, { feedAfterDots });

console.log(
  `[render] "${line1}" / "${line2}" | canvas ${canvas.width}x${canvas.height}px | papel: ${mediaType} | payload ${payload.length} bytes | device: ${device}${dryRun ? " (dry-run)" : ""}`
);
if (dryRun) process.exit(0);

// --- Envío (serie o dispositivo directo) -------------------------------------
const isSerial = (dev) => new RegExp(profile.connection.serialPattern ?? "^COM\\d+$").test(dev);

async function sendSerial(dev) {
  const { SerialPort } = await import("serialport");
  return new Promise((resolve, reject) => {
    const port = new SerialPort({ path: dev, baudRate: profile.connection.defaultBaudRate ?? 57600 });
    port.on("open", () => {
      port.write(payload, (err) => {
        if (err) return reject(err);
        port.drain(() => port.close(() => resolve()));
      });
    });
    port.on("error", reject);
  });
}

async function send() {
  if (isSerial(device)) {
    await sendSerial(device);
  } else {
    writeFileSync(device, payload); // usblp / archivo de dispositivo
  }
  console.log(`[OK] enviado a ${device}`);
}

send().catch((e) => {
  console.error(`[ERROR] no se pudo enviar a ${device}:`, e.message);
  process.exit(1);
});
