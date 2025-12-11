/**
 * MCP Screenshot Server
 */

import { McpServer } from '@tscodex/mcp-sdk';
import { ConfigSchema, type Config } from './config.js';
import { loadConfigForSDK } from './config-loader.js';
import { registerScreenshotTools } from './tools/screenshot.js';
import { registerHtmlCaptureTools } from './tools/html-capture.js';
import { closeBrowserManager } from './browser/browser-manager.js';

const isDev = process.env.NODE_ENV === 'development';

export async function createServer() {
  const server = new McpServer<Config>({
    name: 'mcp-screenshot',
    version: '0.1.0',
    description: 'MCP server for capturing web page screenshots using Playwright',
    configSchema: ConfigSchema,
    configFile: '.mcp-screenshot.json',
    loadConfig: loadConfigForSDK,

    logger: {
      info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
      error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
      debug: (msg, ...args) => isDev && console.debug(`[DEBUG] ${msg}`, ...args)
    }
  });

  // Register tools
  registerScreenshotTools(server);
  registerHtmlCaptureTools(server);

  // Graceful shutdown
  const cleanup = async () => {
    console.log('Shutting down...');
    await closeBrowserManager();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return { server };
}
