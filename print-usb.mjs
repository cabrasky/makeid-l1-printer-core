import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { renderTemplate, canvasToImageData } from "./render.mjs";

// Uso: sudo node print-usb.mjs [template.json] [line1] [line2] [--dry-run]
// Conexión multiplataforma:
//   - PRINTER_DEVICE env (p.ej. "COM3", "/dev/ttyUSB0", "/dev/usb/lp0")
//   - Si parece puerto serie -> serialport (Windows COMx / Linux ttyUSB/ttyACM)
//   - Si es un archivo de dispositivo -> escritura directa (usblp en Linux)
//   - Por defecto: win32 -> COM3 (serie), linux -> /dev/usb/lp0 si existe, si no /dev/ttyUSB0

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const positional = args.filter((a) => a !== "--dry-run");
const templateFile = positional[0] ?? "./templates/backups-term-vt323.json";
const line1 = positional[1] ?? "BACKUPS";
const line2 = positional[2] ?? "USB STORAGE";

const template = JSON.parse(readFileSync(templateFile, "utf8"));
const canvas = renderTemplate(template, { line1, line2 });
const imageData = canvasToImageData(canvas);
const W = canvas.width;
const HB = Math.ceil(canvas.height / 8); // alto en bytes (múltiplo de 8 px)

// Protocolo MakeID L1: framing 0x10 0xFF 0xFE + raster GS v 0 (bloque ÚNICO)
const prefix = [
  0x10, 0xFF, 0xFE, 0x01,
  0x10, 0xFF, 0xFE, 0x40,
  0x1D, 0x76, 0x30,
  HB >> 8, HB & 0xFF,
  W >> 8, W & 0xFF,
  0x00,
];
const postfix = [0x1B, 0x4A, 0x40, 0x10, 0xFF, 0xFE, 0x45];
const payload = Buffer.from([...prefix, ...imageData, ...postfix]);

const isSerial = (dev) =>
  /^COM\d+$/i.test(dev) || /ttyUSB|ttyACM|ttyS|ttyAMA|cu\./i.test(dev) || dev.startsWith("/dev/tty");

function defaultDevice() {
  if (process.platform === "win32") return process.env.PRINTER_DEVICE || "COM3";
  if (existsSync("/dev/usb/lp0")) return "/dev/usb/lp0";
  return "/dev/ttyUSB0";
}

const device = process.env.PRINTER_DEVICE || defaultDevice();

console.log(
  `[render] "${line1}" / "${line2}" | canvas ${W}x${canvas.height}px | payload ${payload.length} bytes | device: ${device}${dryRun ? " (dry-run)" : ""}`
);

if (dryRun) process.exit(0);

async function sendSerial(dev) {
  const { SerialPort } = await import("serialport");
  return new Promise((resolve, reject) => {
    const port = new SerialPort({ path: dev, baudRate: 57600 });
    port.on("open", () => {
      port.write(payload, (err) => {
        if (err) return reject(err);
        port.drain(() => {
          port.close(() => resolve());
        });
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
