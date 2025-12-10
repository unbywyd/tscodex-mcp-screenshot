/**
 * Type definitions for MCP Screenshot Server
 */

export interface ScreenshotOptions {
  selector?: string;
  fullPage?: boolean;
}

export interface ScriptResult {
  buffer: Buffer;
  options: ScreenshotOptions;
}

export interface ViewportConfig {
  width: number;
  height: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

/**
 * Special error class to signal successful screenshot capture
 * Used to break out of script execution when screenshot() is called
 */
export class ScreenshotTaken extends Error {
  constructor(public result: ScriptResult) {
    super('Screenshot taken');
    this.name = 'ScreenshotTaken';
  }
}
