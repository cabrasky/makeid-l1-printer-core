// Export main application class
export { JsonPrinterApp } from './jsonPrinterApp.js';

// Export core services  
export { PrinterService } from './services/printerService.js';

// Export types
export * from './types/index.js';

// Export utilities
export { Logger } from './utils/logger.js';
export { ImageProcessor } from './utils/imageProcessor.js';
export { ArgumentParser } from './utils/argumentParser.js';
export * from './utils/config.js';
export * from './utils/dpiPresets.js';

// Convenience functions for easier usage
import { JsonPrinterApp } from './jsonPrinterApp.js';
import { RenderTemplate } from './types/index.js';

/**
 * Print using a built-in template by name
 */
export async function printTemplate(
  templateName: string,
  variables?: Record<string, string | number>
): Promise<void> {
  const app = new JsonPrinterApp();
  return app.run(templateName, variables);
}

/**
 * Print using a JSON template file
 */
export async function printFromFile(
  templateFilePath: string,
  variables?: Record<string, string | number>
): Promise<void> {
  const app = new JsonPrinterApp();
  return app.runWithFile(templateFilePath, variables);
}

/**
 * Print using a JSON template object
 */
export async function printFromTemplate(
  template: RenderTemplate | object,
  variables?: Record<string, string | number>
): Promise<void> {
  const app = new JsonPrinterApp();
  return app.runWithTemplate(template, variables);
}
