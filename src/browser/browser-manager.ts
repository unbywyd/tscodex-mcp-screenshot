/**
 * Browser Manager - Singleton Playwright browser instance
 * With concurrency control and health checks
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { ViewportConfig } from '../types.js';

/**
 * Simple semaphore for limiting concurrent operations
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}

const MAX_CONCURRENT_CONTEXTS = 5;

export class BrowserManager {
  private browser: Browser | null = null;
  private headless: boolean;
  private semaphore: Semaphore;
  private browserLock: Promise<void> = Promise.resolve();

  constructor(headless: boolean = true) {
    this.headless = headless;
    this.semaphore = new Semaphore(MAX_CONCURRENT_CONTEXTS);
  }

  /**
   * Check if browser is still connected and healthy
   */
  private isBrowserHealthy(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  /**
   * Get browser instance (lazy initialization with health check)
   */
  async getBrowser(): Promise<Browser> {
    // Use lock to prevent race conditions during browser creation
    const currentLock = this.browserLock;
    let releaseLock: () => void;
    this.browserLock = new Promise((resolve) => { releaseLock = resolve; });

    try {
      await currentLock;

      // Check if browser needs to be (re)created
      if (!this.isBrowserHealthy()) {
        // Close old browser if it exists but disconnected
        if (this.browser) {
          try {
            await this.browser.close();
          } catch {
            // Ignore close errors for disconnected browser
          }
          this.browser = null;
        }

        this.browser = await chromium.launch({
          headless: this.headless
        });

        // Handle unexpected browser disconnection
        this.browser.on('disconnected', () => {
          this.browser = null;
        });
      }

      return this.browser!;
    } finally {
      releaseLock!();
    }
  }

  /**
   * Create new browser context with specified viewport
   * Each request gets its own context for isolation
   * Limited by semaphore to prevent memory exhaustion
   */
  async createContext(viewport?: ViewportConfig): Promise<BrowserContext> {
    await this.semaphore.acquire();

    try {
      const browser = await this.getBrowser();
      const context = await browser.newContext({
        viewport: viewport || { width: 1920, height: 1080 }
      });

      // Auto-release semaphore when context is closed
      const originalClose = context.close.bind(context);
      context.close = async () => {
        try {
          await originalClose();
        } finally {
          this.semaphore.release();
        }
      };

      return context;
    } catch (error) {
      // Release semaphore if context creation failed
      this.semaphore.release();
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // Ignore errors during shutdown
      }
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
