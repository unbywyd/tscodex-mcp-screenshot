/**
 * Configuration loader for MCP Screenshot Server
 */

import { type Config, ConfigSchema } from './config.js';

export async function loadConfigForSDK(parsedConfig: Partial<Config>): Promise<Config> {
  const { Value } = await import('@sinclair/typebox/value');

  // Apply defaults and validate
  const config = Value.Cast(ConfigSchema, {
    defaultViewportWidth: 1920,
    defaultViewportHeight: 1080,
    defaultFormat: 'png',
    defaultQuality: 80,
    defaultTimeout: 30000,
    headless: true,
    includePreview: true,
    previewMaxSize: 400,
    ...parsedConfig
  }) as Config;

  return config;
}
