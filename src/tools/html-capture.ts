/**
 * HTML Capture tool registration
 */

import { Type } from '@sinclair/typebox';
import type { McpServer } from '@tscodex/mcp-sdk';
import type { Config } from '../config.js';
import { getBrowserManager } from '../browser/browser-manager.js';
import { executeScript } from '../browser/script-executor.js';
import { validateUrl } from '../utils/path.js';

const HtmlCaptureSchema = Type.Object({
  url: Type.String({ description: 'URL of the page to capture HTML from' }),
  selector: Type.Optional(Type.String({ description: 'CSS selector of element. If specified - capture only this element HTML' })),
  waitFor: Type.Optional(Type.Number({ description: 'Delay before capture in milliseconds (0-30000)', minimum: 0, maximum: 30000 })),
  waitForSelector: Type.Optional(Type.String({ description: 'Wait for element appearance by selector before capture' })),
  viewport: Type.Optional(Type.Object({
    width: Type.Number({ minimum: 320, maximum: 3840 }),
    height: Type.Number({ minimum: 240, maximum: 2160 })
  }, { description: 'Browser viewport dimensions' })),
  timeout: Type.Optional(Type.Number({ description: 'Page load timeout in ms', minimum: 1000, maximum: 120000 })),
  script: Type.Optional(Type.String({ description: 'Playwright script to execute before capture (must call html() to capture)' }))
});

export function registerHtmlCaptureTools(server: McpServer<Config>) {
  /**
   * Main HTML capture tool
   */
  server.addTool({
    name: 'html_capture',
    description: `Capture HTML content from web pages. Use this tool to:
- Get the current DOM state after JavaScript execution
- Capture HTML of specific elements using CSS selectors
- Extract HTML after complex interactions (click menus, fill forms)
- Debug page structure and content

The tool opens the URL in a headless browser, waits for the page to load, and returns the HTML content.

When using 'script' parameter, you MUST call html() in the script to capture the content. The script runs in a sandbox with access to Playwright page methods.

Without selector: returns full page HTML (document.documentElement.outerHTML)
With selector: returns element's outerHTML

Returns: HTML content as text.`,
    schema: HtmlCaptureSchema,

    handler: async (params, context) => {
      const { config, projectRoot } = context;

      // Validate project root
      if (!projectRoot) {
        throw new Error('Project root not provided. Use MCP Manager or set X-MCP-Project-Root header.');
      }

      // Validate URL
      validateUrl(params.url);

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

        let htmlContent: string;
        let capturedSelector: string | undefined;

        // Execute script if provided
        if (params.script) {
          const execResult = await executeScript(params.script, page);
          if (execResult.type !== 'html') {
            throw new Error('Script called screenshot() but html_capture expects html(). Use screenshot_capture tool instead.');
          }
          htmlContent = execResult.result.html;
          capturedSelector = execResult.result.selector;
        } else {
          // Capture HTML based on parameters
          if (params.selector) {
            const element = page.locator(params.selector);
            htmlContent = await element.evaluate((el) => el.outerHTML);
            capturedSelector = params.selector;
          } else {
            htmlContent = await page.content();
          }
        }

        // Build response
        const selectorInfo = capturedSelector ? `\nSelector: ${capturedSelector}` : '\nScope: Full page';
        const sizeInfo = `\nContent length: ${htmlContent.length} characters`;

        return {
          content: [
            {
              type: 'text' as const,
              text: `HTML captured successfully!

URL: ${params.url}${selectorInfo}${sizeInfo}

---

${htmlContent}`
            }
          ]
        };
      } finally {
        // Cleanup
        await browserContext.close();
      }
    }
  });

  /**
   * Simplified element HTML capture tool
   */
  server.addTool({
    name: 'html_element',
    description: `Capture HTML of a specific DOM element on a web page. This is a simplified version of html_capture focused on element HTML.

Use this when you need to capture only a specific part of the page, such as:
- A navigation menu structure
- A form's HTML
- A specific component identified by CSS selector

Returns the element's outerHTML.`,
    schema: Type.Object({
      url: Type.String({ description: 'Page URL' }),
      selector: Type.String({ description: 'CSS selector of element' }),
      waitFor: Type.Optional(Type.Number({ description: 'Delay in ms', minimum: 0, maximum: 30000 }))
    }),

    handler: async (params, context) => {
      const { config, projectRoot } = context;

      if (!projectRoot) {
        throw new Error('Project root not provided. Use MCP Manager or set X-MCP-Project-Root header.');
      }

      validateUrl(params.url);

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

        // Get element HTML
        const element = page.locator(params.selector);
        const htmlContent = await element.evaluate((el) => el.outerHTML);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Element HTML captured!

URL: ${params.url}
Selector: ${params.selector}
Content length: ${htmlContent.length} characters

---

${htmlContent}`
            }
          ]
        };
      } finally {
        await browserContext.close();
      }
    }
  });
}
