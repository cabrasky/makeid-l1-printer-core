import { registerFont, createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
import { 
  PrintOptions, 
  ImageDimensions, 
  RenderTemplate, 
  JsonRenderOptions, 
  RenderElement,
  TextElement,
  LineElement,
  RectangleElement,
  CircleElement,
  StripeElement,
  GridElement,
} from '../types/index.js';
import { Logger } from './logger.js';

/**
 * Configuration constants for image processing
 */
const IMAGE_CONFIG = {
  STANDARD_DPI: 96,
  HEIGHT_MULTIPLIER: 8,
  BITS_PER_BYTE: 8,
  DEBUG_CANVAS_PADDING: 60,
  DEBUG_FONT_SIZE: 12,
  DEBUG_LINE_HEIGHT: 15,
  DEBUG_MARGIN: 5,
  WHITE_PIXEL_VALUE: 0xFF,
  FONT_PATH: 'norwester.ttf',
} as const;

/**
 * Color constants
 */
const COLORS = {
  WHITE: '#ffffff',
  BLACK: '#000000',
  DEBUG_TEXT: '#666666',
} as const;

/**
 * Canvas configuration interface
 */
interface CanvasConfig {
  width: number;
  height: number;
  scaleFactor: number;
  adjustedFontSize: number;
}

/**
 * Image processor for creating printer-ready bitmap data from text and graphics.
 * 
 * This class handles the complete pipeline of:
 * 1. Canvas setup with DPI awareness
 * 2. Font registration and text rendering
 * 3. Graphics drawing (stripes, patterns)
 * 4. Image data conversion to printer format
 * 5. Debug image generation
 * 
 * @example
 * ```typescript
 * const dimensions = { width: 384, height: 32, dpi: 203 };
 * const logger = new Logger();
 * const processor = new ImageProcessor(dimensions, logger);
 * 
 * const options = {
 *   firstLine: "Hello",
 *   secondLine: "World",
 *   fontFamily: "Arial",
 *   fontSize: 12
 * };
 * 
 * const imageData = await processor.createImage(options);
 * ```
 */
export class ImageProcessor {
  private readonly dimensions: ImageDimensions;
  private readonly logger: Logger;

  constructor(dimensions: ImageDimensions, logger: Logger) {
    this.dimensions = dimensions;
    this.logger = logger;
  }

  /**
   * Converts an 8-bit array to a byte value
   */
  private bitArrayToByte(bitArray: readonly number[]): number {
    return bitArray.reduce((value, bit, index) => {
      return bit === 1 ? value | (1 << index) : value;
    }, 0);
  }

  /**
   * Calculates canvas configuration based on options
   */
  private getCanvasConfig(options: PrintOptions): CanvasConfig {
    const scaleFactor = this.dimensions.dpi / IMAGE_CONFIG.STANDARD_DPI;
    const width = this.dimensions.width || 0xE3; // Default width if not specified
    const height = this.dimensions.height * IMAGE_CONFIG.HEIGHT_MULTIPLIER;
    const adjustedFontSize = Math.round(options.fontSize * scaleFactor);

    return {
      width,
      height,
      scaleFactor,
      adjustedFontSize,
    };
  }

  /**
   * Registers the custom font safely
   */
  private registerCustomFont(fontFamily: string): void {
    try {
      registerFont(IMAGE_CONFIG.FONT_PATH, { family: fontFamily });
      this.logger.debug(`Font registered: ${fontFamily}`);
    } catch (error) {
      this.logger.error('Failed to register font, using default', error as Error);
    }
  }

  /**
   * Configures canvas context with appropriate settings
   */
  private configureContext(ctx: CanvasRenderingContext2D, config: CanvasConfig, options: PrintOptions): void {   
    // Fill background with white
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(0, 0, config.width, config.height);
    
    // Set text properties
    ctx.fillStyle = COLORS.BLACK;
    ctx.font = `${config.adjustedFontSize}px "${options.fontFamily}" normal`;
    
    this.logger.debug(`Font size adjusted from ${options.fontSize}px to ${config.adjustedFontSize}px for ${this.dimensions.dpi} DPI`);
  }

  /**
   * Sets up and configures the canvas for printing
   */
  private setupCanvas(options: PrintOptions): { canvas: Canvas; config: CanvasConfig } {
    this.registerCustomFont(options.fontFamily);

    const config = this.getCanvasConfig(options);
    
    this.logger.debug(`Canvas setup: ${config.width}x${config.height}px at ${this.dimensions.dpi} DPI (scale: ${config.scaleFactor.toFixed(2)})`);

    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d');

    this.configureContext(ctx, config, options);

    return { canvas, config };
  }

  /**
   * Draws text lines on the canvas
   */
  private drawText(canvas: Canvas, config: CanvasConfig, options: PrintOptions): void {
    const ctx = canvas.getContext('2d');
    const lines = [
      options.firstLine,
      options.secondLine,
      options.thirdLine,
    ].filter((line): line is string => Boolean(line));

    lines.forEach((line, index) => {
      const yPosition = config.adjustedFontSize * (index + 1);
      ctx.fillText(line, 0, yPosition);
      this.logger.verbose(`Drew line ${index + 1}: "${line}" at y=${yPosition}`);
    });
  }

  /**
   * Processes variable substitution in content
   */
  private processVariables(content: string, variables?: Record<string, string | number>): string {
    if (!variables) return content;
    
    return Object.entries(variables).reduce((result, [key, value]) => {
      const placeholder = `{{${key}}}`;
      return result.replace(new RegExp(placeholder, 'g'), String(value));
    }, content);
  }

  /**
   * Renders a text element on the canvas
   */
  private renderTextElement(ctx: CanvasRenderingContext2D, element: TextElement, config: CanvasConfig, variables?: Record<string, string | number>): void {
    const content = this.processVariables(element.content, variables);
    const fontSize = element.fontSize ? Math.round(element.fontSize * config.scaleFactor) : config.adjustedFontSize;
    const fontFamily = element.fontFamily || 'Arial';
    
    // Save current context
    ctx.save();
    
    // Set font and alignment
    ctx.font = `${fontSize}px "${fontFamily}" normal`;
    ctx.textAlign = element.align || 'left';
    ctx.fillStyle = COLORS.BLACK;
    
    // Scale position
    const x = Math.round(element.position.x * config.scaleFactor);
    const y = Math.round(element.position.y * config.scaleFactor);
    
    ctx.fillText(content, x, y);
    
    // Restore context
    ctx.restore();
    
    this.logger.verbose(`Rendered text: "${content}" at (${x}, ${y})`);
  }

  /**
   * Renders a line element on the canvas
   */
  private renderLineElement(ctx: CanvasRenderingContext2D, element: LineElement, config: CanvasConfig): void {
    ctx.save();
    
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = element.width || 1;
    
    const startX = Math.round(element.start.x * config.scaleFactor);
    const startY = Math.round(element.start.y * config.scaleFactor);
    const endX = Math.round(element.end.x * config.scaleFactor);
    const endY = Math.round(element.end.y * config.scaleFactor);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    ctx.restore();
    
    this.logger.verbose(`Rendered line from (${startX}, ${startY}) to (${endX}, ${endY})`);
  }

  /**
   * Renders a rectangle element on the canvas
   */
  private renderRectangleElement(ctx: CanvasRenderingContext2D, element: RectangleElement, config: CanvasConfig): void {
    ctx.save();
    
    const x = Math.round(element.position.x * config.scaleFactor);
    const y = Math.round(element.position.y * config.scaleFactor);
    const width = Math.round(element.width * config.scaleFactor);
    const height = Math.round(element.height * config.scaleFactor);
    
    if (element.filled) {
      ctx.fillStyle = COLORS.BLACK;
      ctx.fillRect(x, y, width, height);
    } else {
      ctx.strokeStyle = COLORS.BLACK;
      ctx.strokeRect(x, y, width, height);
    }
    
    ctx.restore();
    
    this.logger.verbose(`Rendered ${element.filled ? 'filled' : 'outlined'} rectangle at (${x}, ${y}) ${width}x${height}`);
  }

  /**
   * Renders a circle element on the canvas
   */
  private renderCircleElement(ctx: CanvasRenderingContext2D, element: CircleElement, config: CanvasConfig): void {
    ctx.save();
    
    const centerX = Math.round(element.center.x * config.scaleFactor);
    const centerY = Math.round(element.center.y * config.scaleFactor);
    const radius = Math.round(element.radius * config.scaleFactor);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    
    if (element.filled) {
      ctx.fillStyle = COLORS.BLACK;
      ctx.fill();
    } else {
      ctx.strokeStyle = COLORS.BLACK;
      ctx.stroke();
    }
    
    ctx.restore();
    
    this.logger.verbose(`Rendered ${element.filled ? 'filled' : 'outlined'} circle at (${centerX}, ${centerY}) radius ${radius}`);
  }

  /**
   * Renders a stripe element on the canvas
   */
  private renderStripeElement(ctx: CanvasRenderingContext2D, element: StripeElement, config: CanvasConfig): void {
    ctx.save();
    ctx.fillStyle = COLORS.BLACK;
    
    const bounds = element.bounds ? {
      x: Math.round(element.bounds.x * config.scaleFactor),
      y: Math.round(element.bounds.y * config.scaleFactor),
      width: Math.round(element.bounds.width * config.scaleFactor),
      height: Math.round(element.bounds.height * config.scaleFactor)
    } : {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height
    };
    
    const spacing = Math.round(element.spacing * config.scaleFactor);
    const stripeWidth = Math.round(element.width * config.scaleFactor);
    
    if (element.direction === 'horizontal') {
      for (let y = bounds.y; y < bounds.y + bounds.height; y += spacing) {
        ctx.fillRect(bounds.x, y, bounds.width, Math.min(stripeWidth, bounds.y + bounds.height - y));
      }
    } else {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += spacing) {
        ctx.fillRect(x, bounds.y, Math.min(stripeWidth, bounds.x + bounds.width - x), bounds.height);
      }
    }
    
    ctx.restore();
    
    this.logger.verbose(`Rendered ${element.direction} stripes with ${spacing}px spacing`);
  }

  /**
   * Renders a grid element on the canvas
   */
  private renderGridElement(ctx: CanvasRenderingContext2D, element: GridElement, config: CanvasConfig): void {
    ctx.save();
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = element.lineWidth || 1;
    
    const bounds = element.bounds ? {
      x: Math.round(element.bounds.x * config.scaleFactor),
      y: Math.round(element.bounds.y * config.scaleFactor),
      width: Math.round(element.bounds.width * config.scaleFactor),
      height: Math.round(element.bounds.height * config.scaleFactor)
    } : {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height
    };
    
    const cellWidth = Math.round(element.cellWidth * config.scaleFactor);
    const cellHeight = Math.round(element.cellHeight * config.scaleFactor);
    
    // Draw vertical lines
    for (let x = bounds.x; x <= bounds.x + bounds.width; x += cellWidth) {
      ctx.beginPath();
      ctx.moveTo(x, bounds.y);
      ctx.lineTo(x, bounds.y + bounds.height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = bounds.y; y <= bounds.y + bounds.height; y += cellHeight) {
      ctx.beginPath();
      ctx.moveTo(bounds.x, y);
      ctx.lineTo(bounds.x + bounds.width, y);
      ctx.stroke();
    }
    
    ctx.restore();
    
    this.logger.verbose(`Rendered grid with ${cellWidth}x${cellHeight} cells`);
  }

  /**
   * Renders a single element based on its type
   */
  private renderElement(ctx: CanvasRenderingContext2D, element: RenderElement, config: CanvasConfig, variables?: Record<string, string | number>): void {
    switch (element.type) {
      case 'text':
        this.renderTextElement(ctx, element, config, variables);
        break;
      case 'line':
        this.renderLineElement(ctx, element, config);
        break;
      case 'rectangle':
        this.renderRectangleElement(ctx, element, config);
        break;
      case 'circle':
        this.renderCircleElement(ctx, element, config);
        break;
      case 'stripes':
        this.renderStripeElement(ctx, element, config);
        break;
      case 'grid':
        this.renderGridElement(ctx, element, config);
        break;
      default:
        this.logger.error(`Unknown element type: ${(element as any).type}`);
    }
  }

  /**
   * Renders all elements from a JSON template
   */
  private renderFromTemplate(canvas: Canvas, config: CanvasConfig, template: RenderTemplate, variables?: Record<string, string | number>): void {
    const ctx = canvas.getContext('2d');
    
    this.logger.debug(`Rendering template: ${template.name} with ${template.elements.length} elements`);
    
    template.elements.forEach((element, index) => {
      try {
        this.renderElement(ctx, element, config, variables);
      } catch (error) {
        this.logger.error(`Failed to render element ${index + 1} (${element.type})`, error as Error);
      }
    });
  }

  /**
   * Draws alternating horizontal stripes on the canvas
   */
  private drawStripes(canvas: Canvas, config: CanvasConfig, stripeWidth: number = 4): void {
    const ctx = canvas.getContext('2d');
    const originalFillStyle = ctx.fillStyle;
    
    // Draw alternating black and white horizontal stripes
    for (let y = 0; y < config.height; y += stripeWidth * 2) {
      // Draw black stripe
      ctx.fillStyle = COLORS.BLACK;
      ctx.fillRect(0, y, config.width, stripeWidth);
      
      // Draw white stripe (if there's space)
      if (y + stripeWidth < config.height) {
        ctx.fillStyle = COLORS.WHITE;
        ctx.fillRect(0, y + stripeWidth, config.width, stripeWidth);
      }
    }
    
    // Restore the original fill style
    ctx.fillStyle = originalFillStyle;
    
    this.logger.verbose(`Drew ${stripeWidth}px horizontal stripes across ${config.width}x${config.height} canvas`);
  }

  /**
   * Converts canvas to printer-ready byte array
   */
  private canvasToImageData(canvas: Canvas, config: CanvasConfig): number[] {
    const { stride } = canvas;
    const pixels = canvas.toBuffer('raw');
    const imageData: number[] = [];
    
    this.logger.debug(`Processing canvas: ${config.width}x${config.height}, stride: ${stride}`);

    for (let x = 0; x < config.width; x++) {
      const bitChunk: number[] = [];
      
      for (let y = config.height - 1; y >= 0; y--) {
        const pixelIndex = y * stride + x * 4; // RGBA format
        const blueValue = pixels[pixelIndex];
        const bit = blueValue === IMAGE_CONFIG.WHITE_PIXEL_VALUE ? 0 : 1;
        bitChunk.unshift(bit);
        
        if (bitChunk.length === IMAGE_CONFIG.BITS_PER_BYTE) {
          imageData.push(this.bitArrayToByte(bitChunk));
          bitChunk.length = 0;
        }
      }
    }

    return imageData;
  }

  /**
   * Creates debug metadata text lines
   */
  private createDebugMetadata(config: CanvasConfig, options: PrintOptions): string[] {
    const scaledFontSize = Math.round(options.fontSize * config.scaleFactor);
    return [
      `Size: ${config.width}x${config.height}px @ ${this.dimensions.dpi} DPI`,
      `Font: ${options.fontFamily} ${options.fontSize}px (scaled: ${scaledFontSize}px)`,
      `Lines: "${options.firstLine}" | "${options.secondLine}" | "${options.thirdLine ?? 'none'}"`,
      `Generated: ${new Date().toLocaleString()}`,
    ];
  }

  /**
   * Draws debug metadata on canvas
   */
  private drawDebugMetadata(ctx: CanvasRenderingContext2D, metadata: string[], startY: number): void {
    ctx.fillStyle = COLORS.DEBUG_TEXT;
    ctx.font = `${IMAGE_CONFIG.DEBUG_FONT_SIZE}px Arial`;
    
    metadata.forEach((text, index) => {
      const y = startY + (index * IMAGE_CONFIG.DEBUG_LINE_HEIGHT);
      ctx.fillText(text, IMAGE_CONFIG.DEBUG_MARGIN, y);
    });
  }

  /**
   * Generates a timestamp for unique filenames
   */
  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  /**
   * Saves debug images for development purposes
   */
  private async saveDebugImage(canvas: Canvas, config: CanvasConfig, options: PrintOptions): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const timestamp = this.generateTimestamp();
      
      // Save the original printer image
      await this.saveOriginalImage(canvas, timestamp, fs, path);
      
      // Save the enhanced debug image
      await this.saveEnhancedDebugImage(canvas, config, options, timestamp, fs, path);
      
    } catch (error) {
      this.logger.error('Failed to save debug image', error as Error);
    }
  }

  /**
   * Saves the original printer image
   */
  private async saveOriginalImage(
    canvas: Canvas, 
    timestamp: string, 
    fs: typeof import('fs/promises'), 
    path: typeof import('path')
  ): Promise<void> {
    const filename = `printer-image-${timestamp}.png`;
    const filepath = path.join(process.cwd(), filename);
    const buffer = canvas.toBuffer('image/png');
    
    await fs.writeFile(filepath, buffer);
    this.logger.debug(`Original printer image saved: ${filename}`);
  }

  /**
   * Saves the enhanced debug image with metadata
   */
  private async saveEnhancedDebugImage(
    canvas: Canvas,
    config: CanvasConfig,
    options: PrintOptions,
    timestamp: string,
    fs: typeof import('fs/promises'),
    path: typeof import('path')
  ): Promise<void> {
    const filename = `debug-print-${timestamp}.png`;
    const filepath = path.join(process.cwd(), filename);
    
    // Create debug canvas with extra space for metadata
    const debugCanvas = createCanvas(config.width, config.height + IMAGE_CONFIG.DEBUG_CANVAS_PADDING);
    const debugCtx = debugCanvas.getContext('2d');
    
    // Fill background
    debugCtx.fillStyle = COLORS.WHITE;
    debugCtx.fillRect(0, 0, debugCanvas.width, debugCanvas.height);
    
    // Draw the original image
    debugCtx.drawImage(canvas, 0, 0);
    
    // Add metadata
    const metadata = this.createDebugMetadata(config, options);
    const metadataStartY = config.height + IMAGE_CONFIG.DEBUG_LINE_HEIGHT;
    this.drawDebugMetadata(debugCtx, metadata, metadataStartY);
    
    // Save the debug canvas
    const buffer = debugCanvas.toBuffer('image/png');
    await fs.writeFile(filepath, buffer);
    
    this.logger.debug(`Debug image saved: ${filename}`);
    this.logger.debug(`Image shows: "${options.firstLine}" | "${options.secondLine}" | "${options.thirdLine ?? 'none'}"`);
  }

  /**
   * Validates print options before processing
   */
  private validatePrintOptions(options: PrintOptions): void {
    if (!options.firstLine?.trim()) {
      throw new Error('First line is required and cannot be empty');
    }
    
    if (!options.secondLine?.trim()) {
      throw new Error('Second line is required and cannot be empty');
    }
    
    if (options.fontSize <= 0) {
      throw new Error('Font size must be positive');
    }
    
    if (!options.fontFamily?.trim()) {
      throw new Error('Font family is required');
    }
  }

  /**
   * Creates a printer-ready image from a JSON template
   */
  async createImageFromJson(options: JsonRenderOptions): Promise<{ imageData: number[]; config: CanvasConfig }> {
    const template = options.template;
    
    this.logger.debug(`Starting JSON template rendering: ${template.name}`);
    
    // Override dimensions if specified in template
    const effectiveDimensions = {
      ...this.dimensions,
      ...(template.dimensions && {
        width: template.dimensions.width || this.dimensions.width,
        height: template.dimensions.height || this.dimensions.height
      })
    };
    
    // Create temporary processor with effective dimensions
    const tempProcessor = new ImageProcessor(effectiveDimensions, this.logger);
    
    // Create dummy print options for canvas setup
    const dummyOptions: PrintOptions = {
      firstLine: '',
      secondLine: '',
      fontSize: template.defaultFont?.size || 12,
      fontFamily: template.defaultFont?.family || 'Arial'
    };
    
    const { canvas, config } = tempProcessor.setupCanvas(dummyOptions);
    
    // Render template elements
    this.renderFromTemplate(canvas, config, template, options.variables);
    
    // Save debug images if debugging is enabled
    if (this.logger.isDebugMode()) {
      await this.saveJsonDebugImage(canvas, config, template, options.variables);
    }
    
    // Convert to printer data format
    const imageData = this.canvasToImageData(canvas, config);
    
    this.logger.debug(`Generated JSON template image data: ${imageData.length} bytes`);
    return {imageData, config};
  }

  /**
   * Saves debug images for JSON template rendering
   */
  private async saveJsonDebugImage(canvas: Canvas, config: CanvasConfig, template: RenderTemplate, variables?: Record<string, string | number>): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const timestamp = this.generateTimestamp();
      
      // Save the original image
      const filename = `json-render-${template.name}-${timestamp}.png`;
      const filepath = path.join(process.cwd(), filename);
      const buffer = canvas.toBuffer('image/png');
      
      await fs.writeFile(filepath, buffer);
      this.logger.debug(`JSON template image saved: ${filename}`);
      
      // Save debug info as JSON
      const debugInfo = {
        template: template.name,
        description: template.description,
        timestamp: new Date().toISOString(),
        dimensions: {
          width: config.width,
          height: config.height,
          scaleFactor: config.scaleFactor
        },
        variables: variables || {},
        elements: template.elements.map((element, index) => ({
          index: index + 1,
          elementType: element.type,
          ...element
        }))
      };
      
      const debugFilename = `json-render-debug-${template.name}-${timestamp}.json`;
      const debugFilepath = path.join(process.cwd(), debugFilename);
      await fs.writeFile(debugFilepath, JSON.stringify(debugInfo, null, 2));
      
      this.logger.debug(`JSON template debug info saved: ${debugFilename}`);
      
    } catch (error) {
      this.logger.error('Failed to save JSON template debug image', error as Error);
    }
  }
}
