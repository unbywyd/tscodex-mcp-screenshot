#!/usr/bin/env node
/**
 * MCP Screenshot Server - Entry Point
 */

import { createServer } from './server.js';

async function main() {
  try {
    const { server } = await createServer();

    await server.initialize();
    await server.start();

    console.log(`MCP Screenshot Server started`);
    console.log(`  Host: ${server.serverHost}`);
    console.log(`  Port: ${server.serverPort}`);
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
