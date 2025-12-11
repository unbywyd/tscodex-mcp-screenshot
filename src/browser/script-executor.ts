/**
 * Script Executor - VM Sandbox for user-provided Playwright scripts
 *
 * Security:
 * - Uses Node.js vm module for isolation
 * - Only whitelisted page methods are available
 * - No access to Node.js APIs (fs, process, require, etc.)
 * - Timeout protection (60s max)
 */

import vm from 'node:vm';
import type { Page } from 'playwright';
import {
  ScreenshotTaken,
  HtmlCaptured,
  type ScreenshotOptions,
  type ScriptResult,
  type HtmlCaptureOptions,
  type HtmlCaptureResult
} from '../types.js';

const SCRIPT_TIMEOUT = 60000; // 60 seconds
const MAX_WAIT_TIME = 30000; // 30 seconds max for wait()

export type ScriptExecutionResult =
  | { type: 'screenshot'; result: ScriptResult }
  | { type: 'html'; result: HtmlCaptureResult };

/**
 * Execute user script in isolated VM context
 */
export async function executeScript(script: string, page: Page): Promise<ScriptExecutionResult> {
  // Create isolated context with only allowed APIs
  const context = vm.createContext({
    page: createPageProxy(page),

    // THE MAIN FUNCTION - triggers screenshot and terminates script
    screenshot: async (options: ScreenshotOptions = {}) => {
      let buffer: Buffer;

      if (options.selector) {
        buffer = await page.locator(options.selector).screenshot();
      } else if (options.fullPage) {
        buffer = await page.screenshot({ fullPage: true });
      } else {
        buffer = await page.screenshot();
      }

      // Throw special error to break out of script execution
      throw new ScreenshotTaken({ buffer, options });
    },

    // HTML capture function - triggers HTML capture and terminates script
    html: async (options: HtmlCaptureOptions = {}) => {
      let htmlContent: string;

      if (options.selector) {
        const element = page.locator(options.selector);
        htmlContent = await element.evaluate((el) => el.outerHTML);
      } else {
        htmlContent = await page.content();
      }

      // Throw special error to break out of script execution
      throw new HtmlCaptured({ html: htmlContent, selector: options.selector });
    },

    // Helper function for delays
    wait: (ms: number) => new Promise(r => setTimeout(r, Math.min(ms, MAX_WAIT_TIME))),

    // Disabled console (no-op)
    console: {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {}
    }
  });

  // Wrap script in async IIFE
  const wrappedScript = `(async () => { ${script} })()`;

  try {
    // Execute with timeout
    const result = vm.runInContext(wrappedScript, context, {
      timeout: SCRIPT_TIMEOUT,
      displayErrors: true
    });

    await result;

    // If we get here, script finished without calling screenshot() or html()
    throw new Error('Script must call screenshot() or html() to capture content');
  } catch (e) {
    // Check if this is our special "success" error for screenshot
    if (e instanceof ScreenshotTaken) {
      return { type: 'screenshot', result: e.result };
    }

    // Check if this is our special "success" error for HTML
    if (e instanceof HtmlCaptured) {
      return { type: 'html', result: e.result };
    }

    // Check for timeout
    if (e instanceof Error && e.message.includes('Script execution timed out')) {
      throw new Error(`Script timeout: execution exceeded ${SCRIPT_TIMEOUT / 1000} seconds`);
    }

    // Re-throw other errors
    throw e;
  }
}

/**
 * Create a proxy for the Page object with only whitelisted methods
 */
function createPageProxy(page: Page) {
  return {
    // Navigation
    goto: (url: string, options?: object) => page.goto(url, options),
    reload: (options?: object) => page.reload(options),
    goBack: (options?: object) => page.goBack(options),
    goForward: (options?: object) => page.goForward(options),

    // Interactions
    click: (selector: string, options?: object) => page.click(selector, options),
    dblclick: (selector: string, options?: object) => page.dblclick(selector, options),
    fill: (selector: string, text: string, options?: object) => page.fill(selector, text, options),
    type: (selector: string, text: string, options?: object) => page.type(selector, text, options),
    press: (key: string, options?: object) => page.keyboard.press(key, options),
    hover: (selector: string, options?: object) => page.hover(selector, options),
    focus: (selector: string, options?: object) => page.focus(selector, options),
    selectOption: (selector: string, values: string | string[], options?: object) =>
      page.selectOption(selector, values, options),
    check: (selector: string, options?: object) => page.check(selector, options),
    uncheck: (selector: string, options?: object) => page.uncheck(selector, options),

    // Waiting
    waitForSelector: (selector: string, options?: object) =>
      page.waitForSelector(selector, options),
    waitForLoadState: (state?: 'load' | 'domcontentloaded' | 'networkidle', options?: object) =>
      page.waitForLoadState(state, options),
    waitForTimeout: (ms: number) => page.waitForTimeout(Math.min(ms, MAX_WAIT_TIME)),
    waitForURL: (url: string | RegExp, options?: object) => page.waitForURL(url, options),
    waitForFunction: (fn: string, options?: object) => page.waitForFunction(fn, options),

    // Locators (return chainable locator)
    locator: (selector: string) => createLocatorProxy(page.locator(selector)),
    getByText: (text: string | RegExp, options?: object) =>
      createLocatorProxy(page.getByText(text, options)),
    getByRole: (role: string, options?: object) =>
      createLocatorProxy(page.getByRole(role as any, options)),
    getByPlaceholder: (text: string | RegExp, options?: object) =>
      createLocatorProxy(page.getByPlaceholder(text, options)),
    getByLabel: (text: string | RegExp, options?: object) =>
      createLocatorProxy(page.getByLabel(text, options)),
    getByTestId: (testId: string | RegExp) =>
      createLocatorProxy(page.getByTestId(testId)),

    // Evaluation (browser context only - string functions)
    evaluate: (fn: string | Function, arg?: any) => page.evaluate(fn as any, arg),

    // Scroll
    mouse: {
      wheel: (deltaX: number, deltaY: number) => page.mouse.wheel(deltaX, deltaY)
    }
  };
}

/**
 * Create a proxy for Locator with safe methods
 */
function createLocatorProxy(locator: ReturnType<Page['locator']>): any {
  return {
    click: (options?: object) => locator.click(options),
    dblclick: (options?: object) => locator.dblclick(options),
    fill: (text: string, options?: object) => locator.fill(text, options),
    type: (text: string, options?: object) => locator.type(text, options),
    press: (key: string, options?: object) => locator.press(key, options),
    hover: (options?: object) => locator.hover(options),
    focus: (options?: object) => locator.focus(options),
    check: (options?: object) => locator.check(options),
    uncheck: (options?: object) => locator.uncheck(options),
    selectOption: (values: string | string[], options?: object) =>
      locator.selectOption(values, options),
    waitFor: (options?: object) => locator.waitFor(options),
    isVisible: () => locator.isVisible(),
    isHidden: () => locator.isHidden(),
    isEnabled: () => locator.isEnabled(),
    isDisabled: () => locator.isDisabled(),
    textContent: () => locator.textContent(),
    innerText: () => locator.innerText(),
    innerHTML: () => locator.innerHTML(),
    getAttribute: (name: string) => locator.getAttribute(name),
    count: () => locator.count(),
    first: () => createLocatorProxy(locator.first()),
    last: () => createLocatorProxy(locator.last()),
    nth: (index: number) => createLocatorProxy(locator.nth(index)),
    filter: (options: object) => createLocatorProxy(locator.filter(options)),
    locator: (selector: string) => createLocatorProxy(locator.locator(selector))
  };
}
