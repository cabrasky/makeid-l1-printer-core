import { RenderTemplate } from "../types/index.js";
import fs from "fs/promises";
import path from "path";

/**
 * Service for loading and validating templates
 */
export class TemplateService {
  /**
   * Load template by name from templates directory
   */
  async loadTemplate(templateName: string): Promise<RenderTemplate> {
    try {
      const templatePath = path.join("templates", `${templateName}.json`);
      const templateContent = await fs.readFile(templatePath, "utf-8");
      const template = JSON.parse(templateContent);
      return this.validateTemplate(template);
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        throw new Error(
          `Template "${templateName}" not found. Available templates: labeled-lines, debug-stripes, simple-text, measurement-grid`
        );
      }
      throw new Error(`Failed to load template "${templateName}": ${error}`);
    }
  }

  /**
   * Load template from file path
   */
  async loadTemplateFromFile(filePath: string): Promise<RenderTemplate> {
    try {
      const templateContent = await fs.readFile(filePath, "utf-8");
      const template = JSON.parse(templateContent);
      return this.validateTemplate(template);
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        throw new Error(`Template file "${filePath}" not found`);
      }
      throw new Error(`Failed to load template from file "${filePath}": ${error}`);
    }
  }

  /**
   * Validate template object structure
   */
  validateTemplate(template: any): RenderTemplate {
    if (!template || typeof template !== 'object') {
      throw new Error('Template must be a valid object');
    }
    if (!template.name || typeof template.name !== 'string') {
      throw new Error('Template must have a name property');
    }
    if (!Array.isArray(template.elements)) {
      throw new Error('Template must have an elements array');
    }
    return template as RenderTemplate;
  }
}
