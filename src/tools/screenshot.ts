/**
 * Screenshot tool registration
 */

import { Type } from '@sinclair/typebox';
import type { McpServer } from '@tscodex/mcp-sdk';
import fs from 'node:fs/promises';
import type { Config } from '../config.js';
import { getBrowserManager } from '../browser/browser-manager.js';
import { executeScript } from '../browser/script-executor.js';
import { createPreview, getImageMetadata, formatFileSize } from '../utils/image.js';
import { validateOutputPath, ensureDirectory, validateUrl } from '../utils/path.js';

const ScreenshotSchema = Type.Object({
  url: Type.String({ description: 'URL of the page to screenshot' }),
  outputPath: Type.String({ description: 'Relative path for saving (from project root)' }),
  selector: Type.Optional(Type.String({ description: 'CSS selector of element. If specified - screenshot only this element' })),
  fullPage: Type.Optional(Type.Boolean({ description: 'Screenshot entire page (ignored if selector is specified)', default: false })),
  waitFor: Type.Optional(Type.Number({ description: 'Delay before screenshot in milliseconds (0-30000)', minimum: 0, maximum: 30000 })),
  waitForSelector: Type.Optional(Type.String({ description: 'Wait for element appearance by selector before screenshot' })),
  format: Type.Optional(Type.Union([
    Type.Literal('png'),
    Type.Literal('jpeg'),
    Type.Literal('webp')
  ], { default: 'png', description: 'Image format' })),
  quality: Type.Optional(Type.Number({ description: 'Quality for jpeg/webp (1-100)', minimum: 1, maximum: 100 })),
  viewport: Type.Optional(Type.Object({
    width: Type.Number({ minimum: 320, maximum: 3840 }),
    height: Type.Number({ minimum: 240, maximum: 2160 })
  }, { description: 'Browser viewport dimensions' })),
  deviceScaleFactor: Type.Optional(Type.Number({ description: 'Device scale factor (1 = normal, 2 = retina)', minimum: 1, maximum: 3 })),
  timeout: Type.Optional(Type.Number({ description: 'Page load timeout in ms', minimum: 1000, maximum: 120000 })),
  script: Type.Optional(Type.String({ description: 'Playwright script to execute before screenshot (must call screenshot() to capture)' }))
});

export function registerScreenshotTools(server: McpServer<Config>) {
  /**
   * Main screenshot capture tool
   */
  server.addTool({
    name: 'screenshot_capture',
    description: `Capture screenshots of web pages. Use this tool to:
- Document UI state for debugging or reporting
- Capture visual evidence of web page content
- Take screenshots of specific elements using CSS selectors
- Create visual documentation of responsive layouts at different viewport sizes
- Execute complex interactions (click menus, fill forms) before capturing

The tool opens the URL in a headless browser, waits for the page to load, and saves the screenshot to the specified path relative to the project root.

When using 'script' parameter, you MUST call screenshot() in the script to capture the image. The script runs in a sandbox with access to Playwright page methods.

Returns: Path to saved file, image dimensions, file size, and a small preview image.`,
    schema: ScreenshotSchema,

    handler: async (params, context) => {
      const { config, projectRoot } = context;

      // Validate project root
      if (!projectRoot) {
        throw new Error('Project root not provided. Use MCP Manager or set X-MCP-Project-Root header.');
      }

      // Validate URL
      validateUrl(params.url);

      // Validate and resolve output path
      const fullPath = validateOutputPath(params.outputPath, projectRoot);

      // Get browser manager
      const browserManager = getBrowserManager(config.headless);

      // Create browser context with viewport
      const viewport = params.viewport || {
        width: config.defaultViewportWidth,
        height: config.defaultViewportHeight
      };

      const browserContext = await browserManager.createContext(viewport);

      try {
        // Create new page
        const page = await browserContext.newPage();

        // Set device scale factor if specified
        if (params.deviceScaleFactor && params.deviceScaleFactor > 1) {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height
          });
        }

        // Navigate to URL
        const timeout = params.timeout || config.defaultTimeout;
        await page.goto(params.url, {
          waitUntil: 'networkidle',
          timeout
        });

        // Wait for selector if specified
        if (params.waitForSelector) {
          await page.waitForSelector(params.waitForSelector, { timeout });
        }

        // Wait additional delay if specified
        if (params.waitFor && params.waitFor > 0) {
          await page.waitForTimeout(params.waitFor);
        }

        let screenshotBuffer: Buffer;

        // Execute script if provided
        if (params.script) {
          const execResult = await executeScript(params.script, page);
          if (execResult.type !== 'screenshot') {
            throw new Error('Script called html() but screenshot_capture expects screenshot(). Use html_capture tool instead.');
          }
          screenshotBuffer = execResult.result.buffer;
        } else {
          // Take screenshot based on parameters
          const format = params.format || config.defaultFormat;
          const quality = params.quality || config.defaultQuality;

          const screenshotOptions: {
            type: 'png' | 'jpeg';
            quality?: number;
            fullPage?: boolean;
          } = {
            type: format === 'webp' ? 'png' : format,
            fullPage: params.fullPage
          };

          if (format !== 'png') {
            screenshotOptions.quality = quality;
          }

          if (params.selector) {
            screenshotBuffer = await page.locator(params.selector).screenshot(screenshotOptions);
          } else {
            screenshotBuffer = await page.screenshot(screenshotOptions);
          }
        }

        // Ensure directory exists
        await ensureDirectory(fullPath);

        // Save file
        await fs.writeFile(fullPath, screenshotBuffer);

        // Get metadata
        const metadata = await getImageMetadata(screenshotBuffer);

        // Build response
        const content: Array<{ type: 'text' | 'image'; text?: string; mimeType?: string; data?: string }> = [
          {
            type: 'text' as const,
            text: `Screenshot saved successfully!

Path: ${params.outputPath}
Size: ${metadata.width}x${metadata.height}
Format: ${metadata.format}
File size: ${formatFileSize(metadata.size)}

Full path: ${fullPath}`
          }
        ];

        // Add preview if enabled
        if (config.includePreview) {
          const preview = await createPreview(screenshotBuffer, config.previewMaxSize);
          content.push({
            type: 'image' as const,
            mimeType: 'image/jpeg',
            data: preview
          });
        }

        return { content };
      } finally {
        // Cleanup
        await browserContext.close();
      }
    }
  });

  /**
   * Simplified element screenshot tool (alias)
   */
  server.addTool({
    name: 'screenshot_element',
    description: `Capture a screenshot of a specific DOM element on a web page. This is a simplified version of screenshot_capture focused on element screenshots.

Use this when you need to capture only a specific part of the page, such as:
- A button, form, or navigation component
- A chart or data visualization
- A specific section identified by CSS selector

The element is captured with its exact boundaries - no extra padding or surrounding content.`,
    schema: Type.Object({
      url: Type.String({ description: 'Page URL' }),
      selector: Type.String({ description: 'CSS selector of element' }),
      outputPath: Type.String({ description: 'Path for saving' }),
      waitFor: Type.Optional(Type.Number({ description: 'Delay in ms', minimum: 0, maximum: 30000 }))
    }),

    handler: async (params, context) => {
      const { config, projectRoot } = context;

      if (!projectRoot) {
        throw new Error('Project root not provided. Use MCP Manager or set X-MCP-Project-Root header.');
      }

      validateUrl(params.url);
      const fullPath = validateOutputPath(params.outputPath, projectRoot);

      const browserManager = getBrowserManager(config.headless);
      const browserContext = await browserManager.createContext({
        width: config.defaultViewportWidth,
        height: config.defaultViewportHeight
      });

      try {
        const page = await browserContext.newPage();

        await page.goto(params.url, {
          waitUntil: 'networkidle',
          timeout: config.defaultTimeout
        });

        // Wait for element
        await page.waitForSelector(params.selector, { timeout: config.defaultTimeout });

        if (params.waitFor && params.waitFor > 0) {
          await page.waitForTimeout(params.waitFor);
        }

        // Screenshot element
        const screenshotBuffer = await page.locator(params.selector).screenshot();

        await ensureDirectory(fullPath);
        await fs.writeFile(fullPath, screenshotBuffer);

        const metadata = await getImageMetadata(screenshotBuffer);

        const content: Array<{ type: 'text' | 'image'; text?: string; mimeType?: string; data?: string }> = [
          {
            type: 'text' as const,
            text: `Element screenshot saved!

Path: ${params.outputPath}
Selector: ${params.selector}
Size: ${metadata.width}x${metadata.height}
File size: ${formatFileSize(metadata.size)}

Full path: ${fullPath}`
          }
        ];

        if (config.includePreview) {
          const preview = await createPreview(screenshotBuffer, config.previewMaxSize);
          content.push({
            type: 'image' as const,
            mimeType: 'image/jpeg',
            data: preview
          });
        }

        return { content };
      } finally {
        await browserContext.close();
      }
    }
  });
}
