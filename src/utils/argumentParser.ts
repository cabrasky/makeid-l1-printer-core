import { PrinterConfig, PrintOptions, DebugConfig } from '../types/index.js';

export interface ParsedArguments {
  printerConfig: Partial<PrinterConfig>;
  printOptions: Partial<PrintOptions>;
  debugConfig: Partial<DebugConfig>;
  isTestMode?: boolean;
  testHeight?: number;
  // JSON mode specific options
  templateName?: string;
  variables?: Record<string, string | number>;
  // Additional flags
  renderOnly?: boolean;
  listTemplates?: boolean;
  templateFile?: string;
}

export class ArgumentParser {
  /**
   * Parse command line arguments supporting both legacy positional args and modern flag-based args
   */
  static parse(args: string[]): ParsedArguments {
    const printerConfig: Partial<PrinterConfig> = {};
    const printOptions: Partial<PrintOptions> = {};
    const debugConfig: Partial<DebugConfig> = {};
    const variables: Record<string, string | number> = {};
    
    let templateName: string | undefined;
    let renderOnly = false;
    let listTemplates = false;
    let templateFile: string | undefined;
    let isTestMode = false;
    let testHeight: number | undefined;

    // Check for modern flag-based parsing
    if (args.some(arg => arg.startsWith('--'))) {
      return this.parseFlags(args);
    }

    // Legacy positional argument parsing for backwards compatibility
    const [portPath, firstLine, secondLine, thirdLine] = args;

    if (portPath) {
      printerConfig.portPath = portPath;
    }

    if (firstLine) {
      printOptions.firstLine = firstLine;
    }

    if (secondLine) {
      printOptions.secondLine = secondLine;
    }

    if (thirdLine) {
      printOptions.thirdLine = thirdLine;
    }

    return { 
      printerConfig, 
      printOptions, 
      debugConfig,
      variables: Object.keys(variables).length > 0 ? variables : undefined
    };
  }

  /**
   * Parse modern flag-based arguments
   */
  private static parseFlags(args: string[]): ParsedArguments {
    const result: ParsedArguments = {
      printerConfig: {},
      printOptions: {},
      debugConfig: {},
      variables: {}
    };

    const { flags, variables } = this.extractFlags(args);
    
    this.applyTemplateFlags(flags, variables, result);
    this.applyPrinterFlags(flags, result);
    this.applyPrintOptionsFlags(flags, result);
    this.applyDebugFlags(flags, result);
    this.applySpecialModeFlags(flags, result);

    // Clean up variables if empty
    if (Object.keys(result.variables || {}).length === 0) {
      result.variables = undefined;
    }

    return result;
  }

  private static extractFlags(args: string[]): { flags: Map<string, string | boolean>; variables: string[] } {
    const flags = new Map<string, string | boolean>();
    const variables: string[] = [];
    const processedIndices = new Set<number>();
    
    for (let i = 0; i < args.length; i++) {
      if (processedIndices.has(i)) {
        continue;
      }

      const arg = args[i];
      const nextArg = args[i + 1];

      if (arg.startsWith('--')) {
        if (nextArg && !nextArg.startsWith('--')) {
          if (arg === '--var') {
            variables.push(nextArg);
          } else {
            flags.set(arg, nextArg);
          }
          processedIndices.add(i + 1);
        } else {
          flags.set(arg, true);
        }
      }
    }
    
    return { flags, variables };
  }

  private static applyTemplateFlags(
    flags: Map<string, string | boolean>, 
    variables: string[], 
    result: ParsedArguments
  ): void {
    const templateFlag = flags.get('--json') || flags.get('--template');
    if (typeof templateFlag === 'string') {
      result.templateName = templateFlag;
    }

    const templateFileFlag = flags.get('--template-file');
    if (typeof templateFileFlag === 'string') {
      result.templateFile = templateFileFlag;
    }

    // Handle variables
    result.variables = {};
    for (const varString of variables) {
      const [varKey, varValue] = varString.split('=');
      if (varKey && varValue) {
        const numValue = Number(varValue);
        result.variables[varKey] = isNaN(numValue) ? varValue : numValue;
      }
    }
  }

  private static applyPrinterFlags(flags: Map<string, string | boolean>, result: ParsedArguments): void {
    const portFlag = flags.get('--port') || flags.get('--port-path');
    if (typeof portFlag === 'string') {
      result.printerConfig.portPath = portFlag;
    }

    const baudRateFlag = flags.get('--baud-rate');
    if (typeof baudRateFlag === 'string') {
      const baudRate = parseInt(baudRateFlag);
      if (!isNaN(baudRate)) {
        result.printerConfig.baudRate = baudRate;
      }
    }

    const packetSizeFlag = flags.get('--packet-size');
    if (typeof packetSizeFlag === 'string') {
      const packetSize = parseInt(packetSizeFlag);
      if (!isNaN(packetSize)) {
        result.printerConfig.packetSize = packetSize;
      }
    }

    const exitDelayFlag = flags.get('--exit-delay');
    if (typeof exitDelayFlag === 'string') {
      const exitDelay = parseInt(exitDelayFlag);
      if (!isNaN(exitDelay)) {
        result.printerConfig.exitDelay = exitDelay;
      }
    }

    const packetDelayFlag = flags.get('--packet-delay');
    if (typeof packetDelayFlag === 'string') {
      const packetDelay = parseInt(packetDelayFlag);
      if (!isNaN(packetDelay)) {
        result.printerConfig.packetDelay = packetDelay;
      }
    }
  }

  private static applyPrintOptionsFlags(flags: Map<string, string | boolean>, result: ParsedArguments): void {
    const firstLineFlag = flags.get('--first-line') || flags.get('--line1');
    if (typeof firstLineFlag === 'string') {
      result.printOptions.firstLine = firstLineFlag;
    }

    const secondLineFlag = flags.get('--second-line') || flags.get('--line2');
    if (typeof secondLineFlag === 'string') {
      result.printOptions.secondLine = secondLineFlag;
    }

    const thirdLineFlag = flags.get('--third-line') || flags.get('--line3');
    if (typeof thirdLineFlag === 'string') {
      result.printOptions.thirdLine = thirdLineFlag;
    }

    const fontSizeFlag = flags.get('--font-size');
    if (typeof fontSizeFlag === 'string') {
      const fontSize = parseInt(fontSizeFlag);
      if (!isNaN(fontSize)) {
        result.printOptions.fontSize = fontSize;
      }
    }

    const fontFamilyFlag = flags.get('--font-family');
    if (typeof fontFamilyFlag === 'string') {
      result.printOptions.fontFamily = fontFamilyFlag;
    }
  }

  private static applyDebugFlags(flags: Map<string, string | boolean>, result: ParsedArguments): void {
    if (flags.has('--debug')) {
      result.debugConfig.debugMode = true;
    }
    if (flags.has('--verbose')) {
      result.debugConfig.verboseLogging = true;
    }
    if (flags.has('--no-debug')) {
      result.debugConfig.debugMode = false;
    }
    if (flags.has('--no-verbose')) {
      result.debugConfig.verboseLogging = false;
    }
  }

  private static applySpecialModeFlags(flags: Map<string, string | boolean>, result: ParsedArguments): void {
    if (flags.has('--render-only')) {
      result.renderOnly = true;
    }
    if (flags.has('--list-templates')) {
      result.listTemplates = true;
    }
    if (flags.has('--test')) {
      result.isTestMode = true;
    }

    const testHeightFlag = flags.get('--test-height');
    if (typeof testHeightFlag === 'string') {
      const height = parseInt(testHeightFlag);
      if (!isNaN(height)) {
        result.testHeight = height;
        result.isTestMode = true;
      }
    }
  }

  static mergeWithDefaults(
    parsed: ParsedArguments,
    defaultPrinterConfig: PrinterConfig,
    defaultPrintOptions: PrintOptions
  ): { printerConfig: PrinterConfig; printOptions: PrintOptions } {
    return {
      printerConfig: { ...defaultPrinterConfig, ...parsed.printerConfig },
      printOptions: { ...defaultPrintOptions, ...parsed.printOptions }
    };
  }

  /**
   * Merge debug config with defaults, handling environment variables as fallback
   */
  static mergeDebugConfig(
    parsed: ParsedArguments,
    defaultDebugConfig: DebugConfig
  ): DebugConfig {
    return {
      ...defaultDebugConfig,
      ...parsed.debugConfig
    };
  }

  static validateConfig(config: PrinterConfig): void {
    if (!config.portPath) {
      throw new Error('Port path is required (use --port <path> or set PORT_PATH environment variable)');
    }
    
    if (config.baudRate <= 0) {
      throw new Error('Baud rate must be positive');
    }
    
    if (config.packetSize <= 0) {
      throw new Error('Packet size must be positive');
    }
  }

  static validatePrintOptions(options: PrintOptions): void {
    if (!options.firstLine || !options.secondLine) {
      throw new Error('First and second lines are required (use --line1 and --line2 or set environment variables)');
    }
    
    if (options.fontSize <= 0) {
      throw new Error('Font size must be positive');
    }
  }

  /**
   * Generate help text for command line usage
   */
  static getHelpText(): string {
    return `
MakeID L1 Printer Control - Enhanced Command Line Options
=========================================================

Usage:
  npm run dev [options]                     - Start with options
  npm run dev -- --json <template> [opts]  - JSON template mode
  npm run dev -- --help                    - Show this help

Template Options:
  --json, --template <name>        - Use JSON template by name
  --template-file <path>           - Use JSON template from file path
  --var key=value                  - Set template variable
  --list-templates                 - List available templates
  --render-only                    - Only render to image, don't print

Printer Configuration:
  --port, --port-path <path>       - Serial port (default: COM3)
  --baud-rate <rate>               - Baud rate (default: 57600)
  --packet-size <size>             - Packet size (default: 122)
  --exit-delay <ms>                - Exit delay in ms (default: 2000)
  --packet-delay <ms>              - Packet delay in ms (default: 0)

Print Options:
  --line1, --first-line <text>     - First line of text
  --line2, --second-line <text>    - Second line of text
  --line3, --third-line <text>     - Third line of text (optional)
  --font-size <size>               - Font size (default: 32)
  --font-family <family>           - Font family (default: Norwester Condensed)

Debug Options:
  --debug                          - Enable debug mode
  --verbose                        - Enable verbose logging
  --no-debug                       - Disable debug mode
  --no-verbose                     - Disable verbose logging

Test Options:
  --test                           - Enable test mode
  --test-height <height>           - Set test height and enable test mode

Examples:
  npm run dev -- --port COM3 --line1 "Hello" --line2 "World"
  npm run dev -- --json simple-text --var line1="Test" --var line2="Print"
  npm run dev -- --template labeled-lines --debug --verbose
  npm run dev -- --template-file ./my-template.json --render-only
  npm run dev -- --list-templates
  npm run dev -- --port COM4 --baud-rate 115200 --debug

Note: Command line arguments override environment variables.
`;
  }
}
