import { RenderTemplate } from './index.js';

/**
 * Template loading strategies
 */
export type TemplateLoader = () => Promise<RenderTemplate>;

/**
 * Operation modes for the printer app
 */
export enum OperationMode {
  PRINT = 'print',
  RENDER_ONLY = 'render-only'
}

/**
 * Template execution context
 */
export interface TemplateExecutionContext {
  template: RenderTemplate;
  variables?: Record<string, string | number>;
  mode: OperationMode;
}

export { RenderTemplate };
