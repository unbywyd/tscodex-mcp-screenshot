/**
 * Configuration schema for MCP Screenshot Server
 */

import { Type, type Static, type TSchema } from '@sinclair/typebox';

export const ConfigSchema = Type.Object({
  // Project root (passed via header or config)
  root: Type.Optional(Type.String()),

  // Default viewport
  defaultViewportWidth: Type.Number({ default: 1920, minimum: 320, maximum: 3840 }),
  defaultViewportHeight: Type.Number({ default: 1080, minimum: 240, maximum: 2160 }),

  // Default format
  defaultFormat: Type.Union([
    Type.Literal('png'),
    Type.Literal('jpeg'),
    Type.Literal('webp')
  ], { default: 'png' }),
  defaultQuality: Type.Number({ default: 80, minimum: 1, maximum: 100 }),

  // Timeouts
  defaultTimeout: Type.Number({ default: 30000, minimum: 1000, maximum: 120000 }),

  // Browser
  headless: Type.Boolean({ default: true }),

  // Preview in response
  includePreview: Type.Boolean({ default: true }),
  previewMaxSize: Type.Number({ default: 400, minimum: 100, maximum: 800 })
});

export type Config = Static<typeof ConfigSchema>;
export const ConfigSchemaExport: TSchema = ConfigSchema;
