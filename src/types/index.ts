export interface PrinterConfig {
  portPath: string;
  baudRate: number;
  packetSize: number;
  exitDelay: number;
  packetDelay: number;
}

export interface PrintOptions {
  firstLine: string;
  secondLine: string;
  thirdLine?: string;
  fontSize: number;
  fontFamily: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
  dpi: number;
}

export interface PrinterProtocol {
  firmwareRequest: number[];
  prefix: number[];
  postfix: number[];
}

export interface DebugConfig {
  debugMode: boolean;
  verboseLogging: boolean;
}

// JSON-driven rendering types
export interface Position {
  x: number;
  y: number;
}

export interface TextElement {
  type: 'text';
  content: string;
  position: Position;
  fontSize?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
}

export interface LineElement {
  type: 'line';
  start: Position;
  end: Position;
  width?: number;
}

export interface RectangleElement {
  type: 'rectangle';
  position: Position;
  width: number;
  height: number;
  filled?: boolean;
}

export interface CircleElement {
  type: 'circle';
  center: Position;
  radius: number;
  filled?: boolean;
}

export interface StripeElement {
  type: 'stripes';
  direction: 'horizontal' | 'vertical';
  spacing: number;
  width: number;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface GridElement {
  type: 'grid';
  cellWidth: number;
  cellHeight: number;
  lineWidth?: number;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type RenderElement = 
  | TextElement 
  | LineElement 
  | RectangleElement 
  | CircleElement 
  | StripeElement 
  | GridElement;

export interface RenderTemplate {
  name: string;
  description?: string;
  dimensions?: {
    width?: number;
    height?: number;
  };
  defaultFont?: {
    family: string;
    size: number;
  };
  elements: RenderElement[];
}

export interface JsonRenderOptions {
  template: RenderTemplate;
  variables?: Record<string, string | number>;
}
