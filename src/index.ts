#!/usr/bin/env node

import { JsonPrinterApp } from "./jsonPrinterApp.js";
import { ArgumentParser } from "./utils/argumentParser.js";

function showHelp(): void {
  console.log(ArgumentParser.getHelpText());
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  // Parse arguments using the enhanced ArgumentParser
  const parsedArgs = ArgumentParser.parse(args);

  // Handle special modes
  if (parsedArgs.listTemplates) {
    showTemplateList();
    return;
  }

  // Determine the template name
  const templateName = await determineTemplateName(parsedArgs, args);

  if (!templateName) {
    showTemplateError();
    process.exit(1);
  }

  const jsonApp = new JsonPrinterApp(parsedArgs);
  await executeTemplate(jsonApp, parsedArgs, templateName);
}

function showTemplateList(): void {
  console.log("Available Templates:");
  console.log("  simple-text       - Basic two-line text");
  console.log("  labeled-lines     - Numbered lines for debugging");
  console.log("  debug-stripes     - Horizontal stripes pattern");
  console.log("  measurement-grid  - Grid for alignment testing");
  console.log("  test-dimensions   - Test dimensions template");
  console.log("  example-custom    - Example custom template");
}

function showTemplateError(): void {
  console.error("❌ Template name is required");
  console.log("Use: npm run dev -- --json <template-name>");
  console.log("Or: npm run dev -- --template <template-name>");
  console.log("Available templates: labeled-lines, debug-stripes, simple-text, measurement-grid");
  console.log("Use --list-templates to see all available templates");
}

async function determineTemplateName(parsedArgs: any, args: string[]): Promise<string | undefined> {
  let templateName = parsedArgs.templateName;
  
  // For backwards compatibility with legacy JSON args
  if (!templateName && args.length > 0) {
    const legacyJsonArgs = parseLegacyJsonArgs(args);
    templateName = legacyJsonArgs.templateName;
    
    // Merge legacy variables with parsed variables
    if (legacyJsonArgs.variables && Object.keys(legacyJsonArgs.variables).length > 0) {
      parsedArgs.variables = { ...parsedArgs.variables, ...legacyJsonArgs.variables };
    }
    
    // Use legacy port if not specified in new format
    if (legacyJsonArgs.port && !parsedArgs.printerConfig.portPath) {
      parsedArgs.printerConfig.portPath = legacyJsonArgs.port;
    }
  }

  return templateName;
}

async function executeTemplate(jsonApp: any, parsedArgs: any, templateName: string): Promise<void> {
  if (parsedArgs.renderOnly) {
    // Render-only mode: generate image without connecting to printer
    if (parsedArgs.templateFile) {
      await jsonApp.renderFileOnly(parsedArgs.templateFile, parsedArgs.variables);
      return;
    }
    await jsonApp.renderOnly(templateName, parsedArgs.variables);
    return;
  }

  // Normal mode: connect to printer and print
  if (parsedArgs.templateFile) {
    await jsonApp.runWithFile(parsedArgs.templateFile, parsedArgs.variables);
    return;
  }
  await jsonApp.run(templateName, parsedArgs.variables);
}

// Legacy function for backwards compatibility
function parseLegacyJsonArgs(args: string[]): {
  templateName?: string;
  variables: Record<string, string | number>;
  port?: string;
} {
  const variables: Record<string, string | number> = {};
  let templateName: string | undefined;
  let port: string | undefined;

  // Find --json flag
  const jsonIndex = args.indexOf("--json");
  if (jsonIndex !== -1 && jsonIndex + 1 < args.length) {
    templateName = args[jsonIndex + 1];
  }

  // Find --port flag
  const portIndex = args.indexOf("--port");
  if (portIndex !== -1 && portIndex + 1 < args.length) {
    port = args[portIndex + 1];
  }

  // Find all --var flags
  let varIndex = args.indexOf("--var");
  while (varIndex !== -1) {
    if (varIndex + 1 < args.length) {
      const varArg = args[varIndex + 1];
      const [key, value] = varArg.split("=");
      if (key && value) {
        const numValue = Number(value);
        variables[key] = isNaN(numValue) ? value : numValue;
      }
    }
    varIndex = args.indexOf("--var", varIndex + 1);
  }

  return { templateName, variables, port };
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

main().catch((error) => {
  console.error("Application failed to start:", error);
  process.exit(1);
});