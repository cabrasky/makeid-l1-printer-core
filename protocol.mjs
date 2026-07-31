import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Carga de configuración y perfiles de impresora. Todos los "números mágicos"
// (bytes de protocolo, límites, dpi, papel) viven en printers/*.json y config.json.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)));
const PRINTERS_DIR = path.join(ROOT, "printers");
const CONFIG_PATH = process.env.PRINTER_CONFIG ?? path.join(ROOT, "config.json");

export function loadConfig() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  return config;
}

export function loadProfile(idOrPath) {
  const p = idOrPath.endsWith(".json") ? idOrPath : path.join(PRINTERS_DIR, `${idOrPath}.json`);
  const profile = JSON.parse(readFileSync(p, "utf8"));
  if (!profile.protocol?.gsV0?.headerFormat) {
    throw new Error(`Perfil sin protocolo válido: ${idOrPath}`);
  }
  return profile;
}

// Codificadores de cabecera GS v 0 según el perfil.
//   heightBytesBE-widthPxBE  -> perfil column-major tipo makeid-l1: alto en bytes (BE), ancho en px (BE) + trailer
//   widthBytesLE-heightDotsLE -> ESC/POS estándar: ancho en bytes (LE), alto en dots (LE)
const HEADER_ENCODERS = {
  "heightBytesBE-widthPxBE": (W, H) => [H >> 8, H & 0xff, W >> 8, W & 0xff],
  "widthBytesLE-heightDotsLE": (W, H) => {
    const wb = Math.ceil(W / 8);
    return [wb & 0xff, wb >> 8, H & 0xff, H >> 8];
  },
};

export function buildPayload(profile, raster, widthPx, heightPx, opts = {}) {
  const { protocol, raster: rcfg } = profile;
  const gsV0 = protocol.gsV0;
  const encoder = HEADER_ENCODERS[gsV0.headerFormat];
  if (!encoder) throw new Error(`headerFormat desconocido: ${gsV0.headerFormat}`);

  const header = encoder(widthPx, heightPx);
  const gsV0start = [0x1d, 0x76, 0x30];
  if (typeof gsV0.m === "number") gsV0start.push(gsV0.m); // ESC/POS estándar; L1 no usa m
  const bytes = [
    ...(protocol.prefix ?? []),
    ...gsV0start,
    ...header,
    ...(gsV0.trailer ?? []),
    ...raster,
    ...(protocol.postfix ?? []),
  ];

  // Alimentación extra para papel continuo (L1: feed en dots; ESC/POS: feed en líneas)
  const feed = opts.feedAfterDots ?? opts.feedAfterLines ?? 0;
  if (feed > 0 && protocol.feedCommand) {
    const unit = protocol.feedCommand.unit; // dots | lines
    const amount = unit === "dots" ? opts.feedAfterDots ?? 0 : opts.feedAfterLines ?? 0;
    if (amount > 0) {
      const max = 255;
      let remaining = amount;
      while (remaining > 0) {
        bytes.push(...protocol.feedCommand.opcode, Math.min(remaining, max));
        remaining -= max;
      }
    }
  }

  return Buffer.from(bytes);
}
