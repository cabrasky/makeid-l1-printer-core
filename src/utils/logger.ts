import { DebugConfig } from '../types/index.js';

export class Logger {
  private readonly config: DebugConfig;

  constructor(config: DebugConfig) {
    this.config = config;
  }

  isDebugMode(): boolean {
    return this.config.debugMode;
  }

  debug(message: string): void {
    if (this.config.debugMode) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  verbose(message: string): void {
    if (this.config.verboseLogging) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  error(message: string, error?: Error): void {
    console.error(`[ERROR] ${message}`);
    if (error && this.config.debugMode) {
      console.error(error);
    }
  }

  progress(current: number, total: number, operation: string): void {
    if (this.config.debugMode) {
      console.log(`[PROGRESS] ${operation}: ${current}/${total}`);
    }
  }
}
