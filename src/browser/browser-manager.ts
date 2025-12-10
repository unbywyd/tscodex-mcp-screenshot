/**
 * Browser Manager - Singleton Playwright browser instance
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { ViewportConfig } from '../types.js';

export class BrowserManager {
  private browser: Browser | null = null;
  private headless: boolean;

  constructor(headless: boolean = true) {
    this.headless = headless;
  }

  /**
   * Get browser instance (lazy initialization)
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.headless
      });
    }
    return this.browser;
  }

  /**
   * Create new browser context with specified viewport
   * Each request gets its own context for isolation
   */
  async createContext(viewport?: ViewportConfig): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    return browser.newContext({
      viewport: viewport || { width: 1920, height: 1080 }
    });
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Global instance
let browserManager: BrowserManager | null = null;

export function getBrowserManager(headless: boolean = true): BrowserManager {
  if (!browserManager) {
    browserManager = new BrowserManager(headless);
  }
  return browserManager;
}

export async function closeBrowserManager(): Promise<void> {
  if (browserManager) {
    await browserManager.close();
    browserManager = null;
  }
}
