import sharp from "sharp";
import crypto from "crypto";
import path from "path";
import type { ImageVariant, ImageProcessingSettings } from "./types";

// Default settings - minimal processing for fast uploads
// Client-side compression + Next.js Image handles optimization at serve-time
export const DEFAULT_SETTINGS: ImageProcessingSettings = {
  variants: {
    thumb: { maxEdge: 400, quality: 75 },     // Admin grid, tiny previews
  },
  defaultActiveVariant: "original",  // Use the uploaded (client-compressed) image
  generateWebP: false,
};

/**
 * Sanitize filename WordPress-style
 * "My Photo (2023) - Beach Sunset!.JPG" → "my-photo-2023-beach-sunset"
 */
export function sanitizeFilename(filename: string): string {
  // Remove extension first
  const ext = path.extname(filename);
  const name = filename.slice(0, -ext.length);

  return (
    name
      // Convert to lowercase
      .toLowerCase()
      // Replace accented characters with ASCII equivalents
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Replace spaces and underscores with dashes
      .replace(/[\s_]+/g, "-")
      // Remove all non-alphanumeric characters except dashes
      .replace(/[^a-z0-9-]/g, "")
      // Collapse multiple dashes into one
      .replace(/-+/g, "-")
      // Remove leading and trailing dashes
      .replace(/^-|-$/g, "")
      // Limit length to 100 characters
      .slice(0, 100)
  );
}

/**
 * Generate a short unique suffix (4 chars)
 */
export function generateShortId(): string {
  return crypto.randomBytes(2).toString("hex");
}

/**
 * Generate MD5 hash of file content for deduplication
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash("md5").update(buffer).digest("hex");
}

/**
 * Get image dimensions from buffer
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
  } catch {
    // Not an image or corrupted
  }
  return null;
}

/**
 * Check if file is an image that can be processed
 */
export function isProcessableImage(mime: string): boolean {
  const processable = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ];
  return processable.includes(mime);
}

/**
 * Generate a single image variant
 */
async function generateVariant(
  buffer: Buffer,
  maxEdge: number,
  quality: number,
  outputFormat: "jpeg" | "png" | "webp" = "jpeg"
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Don't upscale - only downscale
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Calculate new dimensions maintaining aspect ratio
  let newWidth = originalWidth;
  let newHeight = originalHeight;

  if (originalWidth > maxEdge || originalHeight > maxEdge) {
    if (originalWidth > originalHeight) {
      newWidth = maxEdge;
      newHeight = Math.round((originalHeight / originalWidth) * maxEdge);
    } else {
      newHeight = maxEdge;
      newWidth = Math.round((originalWidth / originalHeight) * maxEdge);
    }
  }

  // Process image
  let processed = image.resize(newWidth, newHeight, {
    fit: "inside",
    withoutEnlargement: true,
  });

  // Output format
  if (outputFormat === "jpeg") {
    processed = processed.jpeg({ quality, progressive: true });
  } else if (outputFormat === "png") {
    processed = processed.png({ quality });
  } else if (outputFormat === "webp") {
    processed = processed.webp({ quality });
  }

  const outputBuffer = await processed.toBuffer();

  return {
    buffer: outputBuffer,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Process an image and generate all variants
 */
export async function processImage(
  buffer: Buffer,
  originalName: string,
  settings: ImageProcessingSettings = DEFAULT_SETTINGS
): Promise<{
  sanitizedName: string;
  shortId: string;
  hash: string;
  original: {
    width: number;
    height: number;
    size: number;
  };
  variants: {
    display?: { buffer: Buffer; width: number; height: number };
    large?: { buffer: Buffer; width: number; height: number };
    medium?: { buffer: Buffer; width: number; height: number };
    thumb?: { buffer: Buffer; width: number; height: number };
  };
}> {
  // Get sanitized name and IDs
  const sanitizedName = sanitizeFilename(originalName);
  const shortId = generateShortId();
  const hash = generateFileHash(buffer);

  // Get original dimensions
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Determine output format based on original
  const format: "jpeg" | "png" | "webp" =
    metadata.format === "png" ? "png" : "jpeg";

  // Generate only thumbnail variant for fast uploads
  // Client-side compression + Next.js Image handles the rest
  const variants: {
    display?: { buffer: Buffer; width: number; height: number };
    large?: { buffer: Buffer; width: number; height: number };
    medium?: { buffer: Buffer; width: number; height: number };
    thumb?: { buffer: Buffer; width: number; height: number };
  } = {};

  // Only generate thumb variant if original is larger
  const thumbConfig = settings.variants.thumb;
  if (thumbConfig && (originalWidth > thumbConfig.maxEdge || originalHeight > thumbConfig.maxEdge)) {
    variants.thumb = await generateVariant(
      buffer,
      thumbConfig.maxEdge,
      thumbConfig.quality,
      format
    );
  }

  return {
    sanitizedName,
    shortId,
    hash,
    original: {
      width: originalWidth,
      height: originalHeight,
      size: buffer.length,
    },
    variants,
  };
}

/**
 * Build filename for a variant
 */
export function buildVariantFilename(
  baseName: string,
  shortId: string,
  variantName: string | null,
  extension: string
): string {
  if (variantName) {
    return `${baseName}-${shortId}-${variantName}${extension}`;
  }
  return `${baseName}-${shortId}${extension}`;
}






