# printer-core: MakeID L1 Printer Functionality ✨

This package provides the essential core functionality for the MakeID L1 printer, encompassing template rendering, printing operations, and a suite of utility functions. This document serves as a comprehensive guide to its primary entry points: `index.ts` and `lib.ts`.

## 📖 Table of Contents
- [Supported Printers](#supported-printers)
- [index.ts: Application Entry Point](#indexts-application-entry-point)
  - [Example Usage](#example-usage)
- [lib.ts: Core Printing API Reference](#libts-core-printing-api-reference)
  - [printTemplate](#printtemplatetemplatename-string-variables-recordstring-string--number-promisevoid)
  - [printFromFile](#printfromfiletemplatefilepath-string-variables-recordstring-string--number-promisevoid)
  - [printFromTemplate](#printfromtemplatetemplate-rendertemplate--object-variables-recordstring-string--number-promisevoid)
- [Template Structure](#template-structure)
- [Extending and Managing Templates](#extending-and-managing-templates)
  - [Adding New Templates](#adding-new-templates)
  - [Reusable Templates with Variables](#reusable-templates-with-variables)
- [Core Services and Utilities for Advanced Use Cases](#core-services-and-utilities-for-advanced-use-cases)
- [Error Handling and Debugging](#error-handling-and-debugging)
- [CLI and Integration](#cli-and-integration)
- [Example Configuration (printer-config.json)](#example-configuration-printer-configjson)
- [Contributing](#contributing)
- [License](#license)

## Supported Printers 🖨️

Every printer supported by this repo is defined by a **profile** in [`printers/`](printers/) — one JSON file per model (protocol bytes, raster layout, DPI, firmware limits, connection defaults, supported paper). Adding a new printer = adding one JSON file; no code changes required.

| Printer | Profile | USB VID:PID | Protocol | Raster | Connection | Diecut (precut) | Continuous (roll) | Physically validated |
|---|---|---|---|---|---|---|---|---|
| **MakeID L1** *(MakeID Life A1)* | [`printers/makeid-l1.json`](printers/makeid-l1.json) | `09c5:0200` | ✅ Custom framing `0x10 0xFF 0xFE` + GS v 0 | ✅ column-major, topLSB | ✅ USB direct (`/dev/usb/lp0`) + serial 57600 | ✅ **Tested** (227×136, gap sensor) | 🟡 Implemented (feed dots) — not tested on hardware | ✅ Labels printed |
| **Generic ESC/POS 58mm** | [`printers/escpos-58.json`](printers/escpos-58.json) | — | 🟡 Standard ESC/POS GS v 0 | 🟡 row-major, leftLSB | 🟡 Serial (COMx / ttyUSB) | 🟡 Defined (384×200) | 🟡 Defined (feed lines) | ⬜ No hardware yet |

**Legend:** ✅ fully supported · 🟡 implemented, pending hardware validation · ⬜ not started / no hardware

### Integration progression

Each new printer goes through the same stages. The table above reflects where each model stands today:

1. **Profile** — `printers/<id>.json` with protocol bytes, raster layout, limits and media definitions.
2. **Protocol** — header format (`heightBytesBE-widthPxBE`, `widthBytesLE-heightDotsLE`…), framing prefix/postfix, feed command.
3. **Raster** — renderer emits the expected bit layout (column-major / row-major, bit order, white value).
4. **Connection** — direct USB device, serial port (defaults per OS in the profile), `PRINTER_DEVICE` override.
5. **Diecut** — precut label media: raster height must match label height (padding/error handling).
6. **Continuous** — roll media: content-sized raster + configurable extra feed (`feedAfterDots` / `feedAfterLines`).
7. **Physical validation** — real hardware print test (preview ≠ proof; only printing on the actual device closes this stage).

> Adding a printer that only differs in **media size or defaults** (e.g. another 58mm ESC/POS with different label width) is a copy-paste of an existing profile with adjusted values. A printer with a **different raster command or header layout** needs its own `rasterCommand` / `headerFormat` entry — the payload builder (`protocol.mjs`) is the extension point.

## index.ts: Application Entry Point 🚀

The `index.ts` file is designed as the primary entry point for the printer application. Its responsibilities typically include initializing the application, parsing command-line arguments, and orchestrating print operations.

### Example Usage
Here's how you can leverage the `printTemplate`, `printFromFile`, and `printFromTemplate` functions from `index.ts`:

```typescript
import { printTemplate, printFromFile, printFromTemplate } from 'makeid-l1-printer-core/lib.js';

// Print using a built-in template by its registered name
await printTemplate('simple-text', { text: 'Hello World' });

// Print using a JSON template loaded from a file path
await printFromFile('./templates/example-custom.json', { name: 'Alice' });

// Print directly using a template object defined in your code
const templateObj = {
  name: 'Custom',
  description: 'A custom template',
  elements: [ /* ... template elements ... */ ]
};
await printFromTemplate(templateObj, { value: 42 });
```

## lib.ts: Core Printing API Reference 🛠️

The `lib.ts` file exposes a set of convenient, high-level functions for initiating print jobs from various sources. All these functions internally create a new `JsonPrinterApp` instance, handle the print operation asynchronously, and provide robust error logging. In case of failure, the process will gracefully exit with a non-zero code.

### printTemplate(templateName: string, variables?: Record<string, string | number>): Promise<void>
Prints a label using a built-in template, identified by its unique name. For this function to work, the template must either reside in the `templates/` directory or be pre-registered within your application.
- `templateName`: The unique identifier for the template (e.g., 'simple-text').
- `variables`: An optional object containing key-value pairs (string or number) to substitute for placeholders within the template.

### printFromFile(templateFilePath: string, variables?: Record<string, string | number>): Promise<void>
Prints a label by loading its definition from a JSON template file.
- `templateFilePath`: The absolute or relative path to the JSON template file (e.g., './templates/example-custom.json').
- `variables`: An optional object containing key-value pairs (string or number) for template variable substitution.

### printFromTemplate(template: RenderTemplate | object, variables?: Record<string, string | number>): Promise<void>
Prints a label directly from a template object defined inline within your code. This is useful for dynamic template generation.
- `template`: An object that strictly conforms to the RenderTemplate structure.
- `variables`: An optional object containing key-value pairs (string or number) for template variable substitution.

## Template Structure 📐

Templates are standard JSON objects that precisely define the layout and content of your printable labels.

```json
{
  "name": "simple-text",
  "description": "Prints a simple text label",
  "elements": [
    {
      "type": "text",
      "x": 10,
      "y": 20,
      "value": "${text}"
    }
  ]
}
```
- The `elements` array is the core of the template, describing all visual components of the label, such as text fields, lines, shapes, and more. For a comprehensive list of all supported element types and their properties, please refer to the `src/types/templateTypes.ts` file.
- Variables within the template, are denoted by the `${variable}` format (e.g., `${text}`). These placeholders are automatically replaced with the corresponding values provided in the `variables` argument during the print operation, enabling dynamic content generation.

## Extending and Managing Templates ➕

### Adding New Templates
Integrating new custom templates into your printer-core application is straightforward:
1. Create a new JSON file (e.g., `my-new-label.json`) and place it within the `templates/` directory of your project.
2. Define your template's structure within this JSON file, including its elements and any desired variable placeholders, as detailed in the "Template Structure" section.
3. Once created, you can utilize your new template by its name (e.g., `printTemplate('my-new-label', { ... })`) or by its file path (e.g., `printFromFile('./templates/my-new-label.json', { ... })`).

### Reusable Templates with Variables
To maximize the reusability of your templates, make extensive use of variables. By defining generic placeholders like `${productName}`, `${price}`, or `${batchNumber}`, you can use a single template for a multitude of different print jobs. Simply provide a distinct `variables` object for each print operation to populate the template with specific data.

> Tip: Design your templates with reusability in mind to reduce duplication and streamline your printing workflows!

## Core Services and Utilities for Advanced Use Cases ⚙️

For scenarios demanding more granular control over printer operations or for building highly customized workflows, you can directly interact with the underlying core services:
- **PrinterService**: This service is responsible for managing low-level communication protocols with the MakeID L1 printer hardware.
- **Logger**: A robust utility for comprehensive logging and debugging, allowing you to trace application flow and diagnose issues.
- **ImageProcessor**: Handles the critical task of converting structured template data into the specific image formats required by the printer.
- **ArgumentParser**: A helper utility designed for parsing command-line interface (CLI) arguments, enabling configurable application behavior.

Example of direct service usage:
```typescript
import { PrinterService, Logger } from './lib.js';

// Initialize the logger for detailed output, enabling debug mode
const logger = new Logger({ debug: true });

// Create a printer service instance. Configuration details (e.g., port, baud rate)
// would typically be passed here, potentially loaded from a config file.
const printer = new PrinterService(/* config object */);

// You can now use the 'logger' and 'printer' instances for advanced operations.
// For instance, logging an informational message:
logger.info('Printer service initialized successfully.');
```

## Error Handling and Debugging 🐞

The printer-core package incorporates built-in mechanisms to facilitate robust error handling and efficient debugging:
- All primary print functions (`printTemplate`, `printFromFile`, `printFromTemplate`) are meticulously designed to log any errors that occur during the print operation to the console.
- In the event of a critical failure during a print job, the process will exit with a non-zero exit code. This signals an unsuccessful operation, which is crucial for automation scripts and CI/CD pipelines.
- For custom logging requirements and to gain more detailed insights into application behavior, you can directly utilize the `Logger` utility.
- Verbose debug output can be easily enabled by setting `debug.enabled: true` within your configuration file or by passing the appropriate arguments via the command line interface. This provides extensive logs that are invaluable for troubleshooting and development.

## CLI and Integration 🔗

When developing a command-line interface (CLI) tool or integrating printer-core into larger systems, the functions exposed in `lib.ts` serve as your primary interface for initiating printing and rendering operations. Furthermore, the package provides convenient argument parsing and configuration utilities, enabling you to build highly customizable and adaptable workflows for your application.

## Example Configuration (printer-config.json) 📝

Configuration files offer a powerful way to extensively customize printer settings, debug options, and other operational parameters. It is highly recommended to place your `printer-config.json` file in the root directory of your project. Alternatively, you can specify its path via CLI arguments.

```json
{
  "printer": {
    "port": "COM3",
    "baudRate": 115200,
    "width": 384,
    "height": 200
  },
  "debug": {
    "enabled": true,
    "logLevel": "info"
  }
}
```
- `printer.port`: Specifies the serial port connected to your MakeID L1 printer (e.g., COM3 on Windows systems, /dev/ttyUSB0 on Linux/macOS).
- `printer.baudRate`: Sets the communication speed (in bits per second) for the serial connection between your application and the printer.
- `printer.width`/`height`: Defines the desired dimensions (in pixels) of the image data that will be rendered from your templates and sent to the printer.
- `debug.enabled`: A boolean flag that, when set to true, enables detailed debug logging, providing more verbose output for development and troubleshooting.
- `debug.logLevel`: Controls the verbosity level of the logs. Common levels include `info` (general information), `debug` (detailed debugging messages), and `error` (only critical errors).

This configuration can be seamlessly loaded using the utilities available in `lib.ts` or directly incorporated into your application's startup logic via CLI arguments.

## Direct Printing Tools (multiplatform) 🖨️

Besides the serial-based `PrinterService`, the repo includes self-contained CLI tools that render JSON templates and send the raster to the printer. **Preview and print share the exact same renderer** (`render.mjs`), so what you see in the preview is what gets printed.

| Tool | Purpose |
|---|---|
| `print-usb.mjs` | Render template → send raster (direct USB device or serial port) |
| `preview.mjs` | Render template → PNG preview (`node preview.mjs <template> <line1> <line2> out.png`) |
| `mosaic.mjs` | 4×4 design mosaic (16 label designs) to pick from |
| `mosaic4.mjs` | Font sampler: one layout rendered with many typographies |
| `render.mjs` | Shared renderer: template → canvas → column-major raster |
| `fonts.mjs` | Registers bundled fonts (repo `fonts/`) + optional system fonts |

```bash
node print-usb.mjs ./templates/backups-term-vt323.json "BACKUPS" "USB STORAGE" --dry-run  # generate only
sudo node print-usb.mjs ./templates/backups-term-vt323.json "BACKUPS" "USB STORAGE"       # print
```

### Printer connection (Windows & Linux)

- **Serial port** (Bluetooth SPP / USB-serial): `PRINTER_DEVICE=COM3` (Windows) or `PRINTER_DEVICE=/dev/ttyUSB0` (Linux) — uses `serialport` at 57600 baud.
- **Direct USB device** (Linux only): defaults to `/dev/usb/lp0` (usblp) when present — raw device write, no serial needed.
- Defaults: Windows → `COM3` (serial); Linux → `/dev/usb/lp0` if it exists, otherwise `/dev/ttyUSB0`.
- Override anything with the `PRINTER_DEVICE` environment variable.
- On Linux, writing to `/dev/usb/lp0` requires root or membership in the `lp` group (`sudo node print-usb.mjs …`).

### Fonts

Custom fonts are **bundled in `fonts/`** (Norwester, VT323, Share Tech Mono, Audiowide, Rajdhani, Saira Stencil One, Stardos Stencil) and registered by `fonts.mjs` with paths relative to the module — **no hardcoded system paths**, works on Windows and Linux. Optional system fonts (DejaVu/Free/Liberation, POSIX paths) are registered only when present and silently skipped elsewhere.

### Configuration (`config.json`)

All runtime choices live in `config.json` (override with `PRINTER_CONFIG` env):

```json
{
  "printer": "makeid-l1",
  "device": null,
  "media": {
    "type": "diecut",
    "label": null,
    "feedAfterDots": null
  },
  "render": { "textMarginPx": 8, "scaleDpi": 96 }
}
```

- `printer` → profile id from `printers/` (e.g. `makeid-l1`, `escpos-58`).
- `device` → `null` = platform default from the profile (`COM3` on Windows, `/dev/usb/lp0` on Linux); or an explicit serial/device path. `PRINTER_DEVICE` env wins.
- `media.type` → `diecut` (precut labels) or `continuous` (continuous roll):
  - **diecut**: the raster height must match the label height (gap sensor alignment). If the template is shorter it is padded; taller → error.
  - **continuous**: the raster height is the content height; an extra configurable feed is appended (`feedAfterDots` for the L1, dots; ESC/POS profiles use `feedAfterLines`).
- `media.label` → optional `{widthPx, heightPx}` override of the profile's label size.

### Printer profiles (`printers/*.json`)

All "magic numbers" are externalized per printer model: protocol bytes (prefix/GS v 0 header format/postfix/trailer/feed command), raster layout (column-major vs row-major, bit order), DPI, firmware limits, connection defaults and supported paper types. **Adding another printer = adding one JSON file** (see `printers/escpos-58.json` for a standard ESC/POS example). Header formats supported: `heightBytesBE-widthPxBE` (MakeID L1) and `widthBytesLE-heightDotsLE` (standard ESC/POS).

### Protocol notes (MakeID L1)

- The L1 does **not** speak plain ESC/POS text — it needs the custom framing `0x10 0xFF 0xFE` wrapping a GS v 0 raster (all encoded in `printers/makeid-l1.json`).
- Firmware limits: raster width **≤ 255 px** per block (wider → blank paper); safe size is 227×136. Multi-block/split jobs do not work.
- Templates: `dimensions {width, height}` in **pixels**, elements text/rectangle/line/circle/stripes/grid, variables `{{line1}}`/`{{line2}}`.

## Contributing 🤝

We welcome contributions to printer-core! If you have suggestions, bug reports, or want to contribute code, please check out our [Contributing Guidelines](CONTRIBUTING.md).

## License 📄

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
For more in-depth understanding and implementation details, please refer to the source code located in [`src/lib.ts`](src/lib.ts), [`src/index.ts`](src/index.ts), and the [`templates/`](templates/) directory.
