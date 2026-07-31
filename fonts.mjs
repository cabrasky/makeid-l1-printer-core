import { registerFont } from "canvas";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Registra las fuentes del bundle del repo (rutas relativas al módulo ->
// funcionan igual en Windows y Linux, sin paths hardcodeados del sistema).
const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fonts");

// Fuentes incluidas en el repo (fonts/): siempre disponibles.
const BUNDLED = [
  ["Norwester Condensed", "norwester.ttf", "normal"],
  ["VT323", "VT323-Regular.ttf", "normal"],
  ["Share Tech Mono", "ShareTechMono-Regular.ttf", "normal"],
  ["Audiowide", "Audiowide-Regular.ttf", "normal"],
  ["Rajdhani", "Rajdhani-Bold.ttf", "normal"],
  ["Rajdhani", "Rajdhani-Bold.ttf", "bold"],
  ["Saira Stencil One", "SairaStencilOne-Regular.ttf", "normal"],
  ["Stardos Stencil", "StardosStencil-Bold.ttf", "normal"],
  ["Stardos Stencil", "StardosStencil-Bold.ttf", "bold"],
];

// Fuentes de sistema opcionales (Linux: /usr/share/fonts; Windows: se omiten).
// Si no existen, se ignoran silenciosamente: los templates del repo solo usan
// las bundleadas, así que la impresión funciona sin ellas.
const SYSTEM = [
  ["DejaVu Sans Mono", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", "normal"],
  ["DejaVu Sans Mono", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", "bold"],
  ["DejaVu Sans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "normal"],
  ["DejaVu Sans", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "bold"],
  ["DejaVu Serif", "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", "normal"],
  ["DejaVu Serif", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "bold"],
  ["FreeMono", "/usr/share/fonts/truetype/freefont/FreeMono.ttf", "normal"],
  ["FreeMono", "/usr/share/fonts/truetype/freefont/FreeMonoBold.ttf", "bold"],
  ["FreeSans", "/usr/share/fonts/truetype/freefont/FreeSans.ttf", "normal"],
  ["FreeSans", "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf", "bold"],
  ["FreeSerif", "/usr/share/fonts/truetype/freefont/FreeSerif.ttf", "normal"],
  ["FreeSerif", "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf", "bold"],
  ["Liberation Mono", "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf", "normal"],
  ["Liberation Mono", "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf", "bold"],
  ["Liberation Sans", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "normal"],
  ["Liberation Sans", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", "bold"],
];

export function registerAllFonts() {
  let ok = 0;
  for (const [family, file, weight] of BUNDLED) {
    try {
      registerFont(path.join(FONT_DIR, file), { family, weight });
      ok++;
    } catch (e) {
      console.warn(`[fonts] no se pudo registrar ${family}: ${e.message}`);
    }
  }
  for (const [family, file, weight] of SYSTEM) {
    try {
      if (file.startsWith("/") && process.platform === "win32") continue; // paths POSIX: omitir en Windows
      registerFont(file, { family, weight });
      ok++;
    } catch {
      // fuente de sistema ausente: opcional, ignorar
    }
  }
  console.log(`[fonts] ${ok} fuentes registradas (bundle + sistema)`);
}
