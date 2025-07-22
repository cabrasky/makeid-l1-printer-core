import { SerialPort } from "serialport";
import EventEmitter from "node:events";
import {
  ImageDimensions,
  PrinterConfig,
  PrinterProtocol,
} from "../types/index.js";
import { Logger } from "../utils/logger.js";
import { getPrinterProtocol } from "../utils/config.js";

interface ImageSplit {
  data: number[];
  dimensions: ImageDimensions;
  splitIndex: number;
  totalSplits: number;
}

export class PrinterService {
  private static readonly MAX_PRINTER_WIDTH = 255;

  private readonly port: SerialPort;
  private readonly config: PrinterConfig;
  private readonly logger: Logger;
  private readonly portData: EventEmitter;
  private protocol: PrinterProtocol;

  constructor(
    config: PrinterConfig,
    protocol: PrinterProtocol,
    logger: Logger
  ) {
    this.config = config;
    this.logger = logger;
    this.portData = new EventEmitter();
    this.protocol = protocol;

    this.port = new SerialPort({
      path: config.portPath,
      baudRate: config.baudRate,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.port.on("data", (buf: Buffer) => {
      this.portData.emit("data", buf);
    });

    this.port.on("error", (error: Error) => {
      this.logger.error("Serial port error", error);
    });

    this.port.on("close", () => {
      this.logger.debug("Serial port closed");
    });
  }

  private async waitForData(): Promise<Buffer> {
    return new Promise((resolve) => {
      this.portData.once("data", (buf: Buffer) => resolve(buf));
    });
  }

  private async writeData(data: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port.write(Buffer.from(data), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async delay(ms: number): Promise<void> {
    if (ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  async getFirmwareVersion(): Promise<string> {
    this.logger.debug("Requesting firmware version");
    await this.writeData(this.protocol.firmwareRequest);
    const firmwareVersion = await this.waitForData();
    return firmwareVersion.toString();
  }

  private calculateImageSplits(
    imageData: number[],
    imageDimensions: ImageDimensions
  ): ImageSplit[] {
    const { width: totalWidth, height, dpi } = imageDimensions;
    const splits = Math.ceil(totalWidth / PrinterService.MAX_PRINTER_WIDTH);
    const imageSplits: ImageSplit[] = [];

    for (let splitIndex = 0; splitIndex < splits; splitIndex++) {
      const startPos = splitIndex * PrinterService.MAX_PRINTER_WIDTH * height;
      const currentWidth = Math.min(
        PrinterService.MAX_PRINTER_WIDTH,
        totalWidth - splitIndex * PrinterService.MAX_PRINTER_WIDTH
      );

      const splitDimensions: ImageDimensions = {
        width: currentWidth,
        height,
        dpi,
      };

      const splitImageData = imageData.slice(
        startPos,
        startPos + currentWidth * height
      );

      imageSplits.push({
        data: splitImageData,
        dimensions: splitDimensions,
        splitIndex,
        totalSplits: splits,
      });
    }

    return imageSplits;
  }

  private async sendImageSplit(split: ImageSplit): Promise<void> {
    const { data, dimensions, splitIndex, totalSplits } = split;

    // Recalculate protocol for current split dimensions
    this.protocol = getPrinterProtocol(dimensions);
    this.logger.debug(
      `Sending split ${splitIndex + 1}/${totalSplits} with dimensions: ${
        dimensions.width
      }x${dimensions.height} at ${dimensions.dpi} DPI`
    );

    const message = [...this.protocol.prefix, ...data];
    this.logger.debug(`Split message size: ${message.length} bytes`);

    await this.sendDataInPackets(message, splitIndex + 1, totalSplits);
  }

  private async sendDataInPackets(
    data: number[],
    splitNumber: number,
    totalSplits: number
  ): Promise<void> {
    const totalPackets = Math.ceil(data.length / this.config.packetSize);

    for (let i = 0; i < data.length; i += this.config.packetSize) {
      const chunk = data.slice(i, i + this.config.packetSize);
      const packetNumber = Math.floor(i / this.config.packetSize) + 1;

      await this.writeData(chunk);
      this.logger.progress(
        packetNumber,
        totalPackets,
        `Sending packets for split ${splitNumber}/${totalSplits}`
      );

      await this.delay(this.config.packetDelay);
    }
  }

  async sendImageData(
    imageData: number[],
    imageDimensions: ImageDimensions
  ): Promise<void> {
    const imageSplits = this.calculateImageSplits(imageData, imageDimensions);

    this.logger.debug(`Image will be sent in ${imageSplits.length} split(s)`);

    // Send each split
    for (const split of imageSplits) {
      await this.sendImageSplit(split);
    }

    // Send final postfix if defined
    this.logger.debug("Sending postfix data");
    await this.writeData(this.protocol.postfix);

    this.logger.info("Image data sent successfully");
  }

  async waitForCompletion(): Promise<void> {
    this.logger.debug(`Waiting ${this.config.exitDelay}ms before exit`);
    await this.delay(this.config.exitDelay);
  }

  onOpen(callback: () => Promise<void>): void {
    this.port.on("open", callback);
  }

  close(): void {
    if (this.port.isOpen) {
      this.port.close();
    }
  }
}
