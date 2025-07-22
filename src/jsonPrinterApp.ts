import { Logger } from "./utils/logger.js";
import { ImageProcessor } from "./utils/imageProcessor.js";
import { PrinterService } from "./services/printerService.js";
import { TemplateService } from "./services/templateService.js";
import { RenderTemplate, JsonRenderOptions } from "./types/index.js";
import { TemplateLoader } from "./types/templateTypes.js";
import {
  IMAGE_DIMENSIONS,
  getPrinterProtocol,
  getPrinterConfigWithArgs,
  getDebugConfigWithArgs,
} from "./utils/config.js";
import { ParsedArguments } from "./utils/argumentParser.js";

/**
 * JSON-driven printer application
 */
export class JsonPrinterApp {
  private readonly logger: Logger;
  private readonly imageProcessor: ImageProcessor;
  private readonly printerService: PrinterService;
  private readonly templateService: TemplateService;
  private readonly parsedArgs?: ParsedArguments;

  constructor(parsedArgs?: ParsedArguments) {
    this.parsedArgs = parsedArgs;
    
    const debugConfig = getDebugConfigWithArgs(parsedArgs);
    const printerConfig = getPrinterConfigWithArgs(parsedArgs);

    this.logger = new Logger(debugConfig);
    this.imageProcessor = new ImageProcessor(IMAGE_DIMENSIONS, this.logger);
    this.printerService = new PrinterService(
      printerConfig,
      getPrinterProtocol(IMAGE_DIMENSIONS),
      this.logger
    );
    this.templateService = new TemplateService();
  }

  /**
   * Core rendering logic shared between print and render-only modes
   */
  private async renderTemplate(
    template: RenderTemplate,
    variables?: Record<string, string | number>
  ) {
    this.logger.info(`🎨 Rendering template: ${template.name}`);

    if (template.description) {
      this.logger.info(`📄 ${template.description}`);
    }

    if (variables && Object.keys(variables).length > 0) {
      this.logger.info(`📝 Variables: ${JSON.stringify(variables)}`);
    }

    // Create render options
    const options: JsonRenderOptions = {
      template,
      variables,
    };

    // Generate image from template
    const imageData = await this.imageProcessor.createImageFromJson(options);
    this.logger.debug(
      `Generated image data size: ${imageData.imageData.length} bytes`
    );
    this.logger.info(
      `✅ Generated ${imageData.imageData.length} bytes from ${template.elements.length} elements`
    );

    return imageData;
  }

  private async handleConnection(
    template: RenderTemplate,
    variables?: Record<string, string | number>
  ): Promise<void> {
    try {
      this.logger.info("🔌 Printer connected!");

      // Get firmware version
      const firmwareVersion = await this.printerService.getFirmwareVersion();
      this.logger.info(`🔧 Printer firmware: ${firmwareVersion}`);

      // Render the template
      const imageData = await this.renderTemplate(template, variables);

      // Send to printer
      await this.printerService.sendImageData(imageData.imageData, {
        ...IMAGE_DIMENSIONS,
        width: imageData.config.width,
      });

      this.logger.info("📤 Image data sent successfully");

      // Wait for completion
      await this.printerService.waitForCompletion();

      this.logger.info("🎉 Print job completed!");
      this.logger.info("📋 Check your printer output");

      process.exit(0);
    } catch (error) {
      this.logger.error(
        "❌ Error during JSON template printing",
        error as Error
      );
      process.exit(1);
    }
  }

  /**
   * Generic method to execute operations with template
   */
  private async executeWithTemplate(
    getTemplate: TemplateLoader,
    variables?: Record<string, string | number>,
    renderOnly: boolean = false
  ): Promise<void> {
    try {
      const template = await getTemplate();
      
      if (renderOnly) {
        await this.performRenderOnly(template, variables);
      } else {
        await this.performPrint(template, variables);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to ${renderOnly ? 'render' : 'print'} template`,
        error as Error
      );
      process.exit(1);
    }
  }

  /**
   * Perform print operation with printer connection
   */
  private async performPrint(
    template: RenderTemplate,
    variables?: Record<string, string | number>
  ): Promise<void> {
    this.printerService.onOpen(() =>
      this.handleConnection(template, variables)
    );
    this.setupProcessHandlers();
  }

  /**
   * Perform render-only operation (no printer)
   */
  private async performRenderOnly(
    template: RenderTemplate,
    variables?: Record<string, string | number>
  ): Promise<void> {
    this.logger.info(`🎨 Rendering template: ${template.name} (render-only mode)`);
    
    await this.renderTemplate(template, variables);
    
    this.logger.info("🖼️ Image saved to debug-render.png");
    this.logger.info("🎉 Render completed!");
    
    process.exit(0);
  }

  async run(
    templateName: string,
    variables?: Record<string, string | number>
  ): Promise<void> {
    await this.executeWithTemplate(
      () => this.templateService.loadTemplate(templateName),
      variables,
      false
    );
  }

  async runWithFile(
    templateFilePath: string,
    variables?: Record<string, string | number>
  ): Promise<void> {
    await this.executeWithTemplate(
      () => this.templateService.loadTemplateFromFile(templateFilePath),
      variables,
      false
    );
  }

  async runWithTemplate(
    template: RenderTemplate | object,
    variables?: Record<string, string | number>
  ): Promise<void> {
    await this.executeWithTemplate(
      () => Promise.resolve(this.templateService.validateTemplate(template)),
      variables,
      false
    );
  }

  /**
   * Render template to image only (no printer connection)
   */
  async renderOnly(
    templateName: string,
    variables?: Record<string, string | number>
  ): Promise<void> {
    await this.executeWithTemplate(
      () => this.templateService.loadTemplate(templateName),
      variables,
      true
    );
  }

  /**
   * Render template file to image only (no printer connection)
   */
  async renderFileOnly(
    templateFilePath: string,
    variables?: Record<string, string | number>
  ): Promise<void> {
    await this.executeWithTemplate(
      () => this.templateService.loadTemplateFromFile(templateFilePath),
      variables,
      true
    );
  }

  private setupProcessHandlers(): void {
    process.on("SIGINT", () => {
      this.logger.info("Received SIGINT, closing printer connection");
      this.printerService.close();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      this.logger.info("Received SIGTERM, closing printer connection");
      this.printerService.close();
      process.exit(0);
    });
  }
}
