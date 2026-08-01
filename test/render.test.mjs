// Test de render multiplataforma (corre en CI: ubuntu + windows).
// Verifica que el pipeline render→payload produce exactamente los bytes
// esperados sin necesidad de impresora (dry-run).
//
//   node test/render.test.mjs
import { printJob } from "../print-usb.mjs";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TPL_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "templates", "backups-term-vt323.json");
const tpl = JSON.parse(readFileSync(TPL_PATH, "utf8"));
const vars = { line1: "BACKUPS", line2: "USB STORAGE" };

const dir = mkdtempSync(path.join(tmpdir(), "lpc-render-"));
const cfgPath = (media, feedAfterDots = null) => {
  const p = path.join(dir, `cfg-${media}.json`);
  writeFileSync(
    p,
    JSON.stringify({
      printer: "makeid-l1",
      device: null,
      media: { type: media, label: null, feedAfterDots },
      render: { textMarginPx: 8, scaleDpi: 96 },
    })
  );
  return p;
};

// Payload conocido y validado físicamente en la MakeID L1 (diecut 227×136)
const EXPECTED_DIECUT = 3882;

const diecut = await printJob({ template: tpl, variables: vars, dryRun: true, configPath: cfgPath("diecut") });
const continuous = await printJob({ template: tpl, variables: vars, dryRun: true, configPath: cfgPath("continuous", 30) });

const checks = [];
checks.push(["diecut genera exactamente los bytes esperados", diecut.bytes === EXPECTED_DIECUT, `got ${diecut.bytes}`]);
checks.push(["diecut reporta mediaType correcto", diecut.mediaType === "diecut", diecut.mediaType]);
checks.push(["continuous genera más bytes que diecut (feed extra)", continuous.bytes > diecut.bytes, `${continuous.bytes} vs ${diecut.bytes}`]);
checks.push(["dryRun no abre dispositivo", diecut.dryRun === true && diecut.device, String(diecut.device)]);

let failed = false;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failed = true;
}
console.log(`\ndiecut: ${diecut.bytes} bytes | continuous: ${continuous.bytes} bytes (${process.platform})`);
if (failed) process.exit(1);
console.log("RENDER OK");
