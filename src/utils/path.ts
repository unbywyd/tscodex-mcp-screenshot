/**
 * Path utilities for safe file operations
 */

import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Validate output path to prevent directory traversal attacks
 * Returns the full absolute path if valid
 * Throws if invalid
 */
export function validateOutputPath(outputPath: string, projectRoot: string): string {
  // Normalize paths
  const normalizedOutput = path.normalize(outputPath);
  const normalizedRoot = path.normalize(projectRoot);

  // Check for directory traversal attempts
  if (normalizedOutput.includes('..')) {
    throw new Error('Invalid output path: directory traversal not allowed');
  }

  // Build full path
  const fullPath = path.isAbsolute(normalizedOutput)
    ? normalizedOutput
    : path.join(normalizedRoot, normalizedOutput);

  // Ensure path is within project root
  const resolvedPath = path.resolve(fullPath);
  const resolvedRoot = path.resolve(normalizedRoot);

  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error('Invalid output path: must be within project root');
  }

  return resolvedPath;
}

/**
 * Ensure directory exists, create if not
 */
export async function ensureDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Validate URL (http/https only)
 */
export function validateUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid URL: only http and https protocols are supported');
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Invalid URL:')) {
      throw e;
    }
    throw new Error(`Invalid URL: ${url}`);
  }
}
