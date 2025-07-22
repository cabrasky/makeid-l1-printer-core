import dotenv from 'dotenv';
import { PrinterConfig, PrintOptions, ImageDimensions, PrinterProtocol, DebugConfig } from '../types/index.js';
import { ParsedArguments } from './argumentParser.js';

// Load environment variables
dotenv.config();

export const IMAGE_DIMENSIONS: ImageDimensions = {
  width: 0xE3,
  height: 0x11, 
  dpi: parseInt(process.env.PRINTER_DPI ?? '203')
};

export const getPrinterProtocol = (imageDimensions: ImageDimensions): PrinterProtocol => {
  return {
    firmwareRequest: [0x10, 0xFF, 0x20, 0xF1],
    prefix: [
      0x10, 0xFF, 0xFE, 0x01, 0x10, 0xFF, 0xFE, 0x40, 0x1D, 0x76, 0x30,
      imageDimensions.height >> 8, imageDimensions.height & 0xFF,
      imageDimensions.width >> 8, imageDimensions.width & 0xFF, 0x00
    ],
    postfix: [0x1B, 0x4A, 0x40, 0x10, 0xFF, 0xFE, 0x45]
  };
};

export function getPrinterConfig(): PrinterConfig {
  return {
    portPath: process.env.PORT_PATH ?? 'COM3',
    baudRate: parseInt(process.env.BAUD_RATE ?? '57600'),
    packetSize: 122,
    exitDelay: parseInt(process.env.EXIT_DELAY ?? '2000'),
    packetDelay: parseInt(process.env.PACKET_DELAY ?? '0')
  };
}

export function getDebugConfig(): DebugConfig {
  return {
    debugMode: process.env.DEBUG_MODE === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true'
  };
}

export function getDefaultPrintOptions(): PrintOptions {
  return {
    firstLine: process.env.FIRST_LINE ?? 'HELLO WORLD',
    secondLine: process.env.SECOND_LINE ?? 'TEST PRINT',
    thirdLine: process.env.THIRD_LINE,
    fontSize: parseInt(process.env.FONT_SIZE ?? '32'),
    fontFamily: process.env.FONT_FAMILY ?? 'Norwester Condensed'
  };
}

export function getEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export function getPrinterConfigWithArgs(parsedArgs?: ParsedArguments): PrinterConfig {
  const baseConfig = getPrinterConfig();
  if (!parsedArgs?.printerConfig) {
    return baseConfig;
  }
  return { ...baseConfig, ...parsedArgs.printerConfig };
}

export function getDebugConfigWithArgs(parsedArgs?: ParsedArguments): DebugConfig {
  const baseConfig = getDebugConfig();
  if (!parsedArgs?.debugConfig) {
    return baseConfig;
  }
  return { ...baseConfig, ...parsedArgs.debugConfig };
}

export function getDefaultPrintOptionsWithArgs(parsedArgs?: ParsedArguments): PrintOptions {
  const baseOptions = getDefaultPrintOptions();
  if (!parsedArgs?.printOptions) {
    return baseOptions;
  }
  return { ...baseOptions, ...parsedArgs.printOptions };
}