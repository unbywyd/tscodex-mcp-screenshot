/**
 * Image utilities using Sharp
 */

import sharp from 'sharp';
import type { ImageMetadata } from '../types.js';

/**
 * Create optimized preview for display in Cursor/Claude
 * - Resize to maxSize x maxSize (fit: inside)
 * - Convert to JPEG quality 75
 * - Return base64 string
 */
export async function createPreview(buffer: Buffer, maxSize: number = 400): Promise<string> {
  const optimized = await sharp(buffer)
    .resize(maxSize, maxSize, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 75,
      mozjpeg: true
    })
    .toBuffer();

  return optimized.toString('base64');
}

/**
 * Get image metadata
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
