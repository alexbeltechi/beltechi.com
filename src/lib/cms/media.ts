/**
 * Media Management
 * 
 * Handles media uploads and management.
 * - Development: Local filesystem (public/uploads/)
 * - Production: Vercel Blob + GitHub API for index
 */

import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { MediaItem, MediaIndex, ImageVariant } from "./types";
import {
  sanitizeFilename,
  generateShortId,
  generateFileHash,
  processImage,
  buildVariantFilename,
  isProcessableImage,
  getImageDimensions,
  DEFAULT_SETTINGS,
} from "./image-processing";
import { getStorage } from "./storage";
import { 
  shouldUseBlob, 
  uploadToBlob, 
  deleteFromBlob,
  deleteMultipleFromBlob 
} from "./blob-storage";

// Storage paths
const MEDIA_INDEX_PATH = "content/media/index.json";

// Local directories (for development)
const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const ORIGINALS_DIR = path.join(UPLOADS_DIR, "originals");
const VARIANTS_DIR = path.join(UPLOADS_DIR, "variants");

/**
 * Ensure local directories exist (for development)
 */
async function ensureLocalDirs(): Promise<void> {
  if (!shouldUseBlob()) {
    await fs.mkdir(ORIGINALS_DIR, { recursive: true });
    await fs.mkdir(VARIANTS_DIR, { recursive: true });
  }
}

/**
 * Load media index from storage
 */
async function loadIndex(): Promise<MediaIndex> {
  const storage = getStorage();
  
  try {
    const content = await storage.read(MEDIA_INDEX_PATH);
    return JSON.parse(content) as MediaIndex;
  } catch {
    return { items: [] };
  }
}

/**
 * Save media index to storage
 */
async function saveIndex(index: MediaIndex, message?: string): Promise<void> {
  const storage = getStorage();
  await storage.write(
    MEDIA_INDEX_PATH,
    JSON.stringify(index, null, 2),
    message || "Update media index"
  );
}

/**
 * Save file to storage (local or Blob)
 */
async function saveFile(
  buffer: Buffer,
  filename: string,
  folder: "originals" | "variants" | "",
  mime: string
): Promise<{ path: string; url: string }> {
  if (shouldUseBlob()) {
    // Upload to Vercel Blob
    const blobFolder = folder ? `uploads/${folder}` : "uploads";
    const result = await uploadToBlob(buffer, filename, {
      contentType: mime,
      folder: blobFolder,
    });
    return {
      path: result.pathname,
      url: result.url,
    };
  } else {
    // Save to local filesystem
    let dir: string;
    let urlPath: string;
    
    if (folder === "originals") {
      dir = ORIGINALS_DIR;
      urlPath = `/uploads/originals/${filename}`;
    } else if (folder === "variants") {
      dir = VARIANTS_DIR;
      urlPath = `/uploads/variants/${filename}`;
    } else {
      dir = UPLOADS_DIR;
      urlPath = `/uploads/${filename}`;
    }
    
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);
    
    return {
      path: filePath,
      url: urlPath,
    };
  }
}

/**
 * Delete file from storage (local or Blob)
 */
async function deleteFile(urlOrPath: string): Promise<void> {
  if (shouldUseBlob()) {
    // Delete from Vercel Blob (needs full URL)
    if (urlOrPath.startsWith("http")) {
      await deleteFromBlob(urlOrPath);
    }
  } else {
    // Delete from local filesystem
    try {
      // If it's a URL, convert to path
      if (urlOrPath.startsWith("/uploads/")) {
        urlOrPath = path.join(PUBLIC_DIR, urlOrPath);
      }
      await fs.unlink(urlOrPath);
    } catch {
      // File might already be deleted
    }
  }
}

/**
 * List all media items
 */
export async function listMedia(options: {
  limit?: number;
  offset?: number;
  mime?: string;
} = {}): Promise<{ items: MediaItem[]; total: number }> {
  const index = await loadIndex();
  let items = index.items;

  // Filter by mime type
  if (options.mime) {
    items = items.filter((item) => item.mime.startsWith(options.mime!));
  }

  // Sort by createdAt descending
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = items.length;

  // Pagination
  if (options.offset !== undefined || options.limit !== undefined) {
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    items = items.slice(offset, offset + limit);
  }

  return { items, total };
}

/**
 * Get a single media item by ID
 */
export async function getMedia(id: string): Promise<MediaItem | null> {
  const index = await loadIndex();
  return index.items.find((item) => item.id === id) || null;
}

/**
 * Get multiple media items by IDs
 */
export async function getMediaByIds(ids: string[]): Promise<MediaItem[]> {
  const index = await loadIndex();
  const itemMap = new Map(index.items.map((item) => [item.id, item]));

  return ids
    .map((id) => itemMap.get(id))
    .filter((item): item is MediaItem => item !== undefined);
}

/**
 * Get the appropriate extension for a mime type
 */
function getExtension(mime: string, originalExt: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
  };
  return mimeToExt[mime] || originalExt;
}

/**
 * Upload a new media file with image optimization
 */
export async function uploadMedia(
  file: Buffer,
  originalName: string,
  mime: string
): Promise<{ item?: MediaItem; error?: string }> {
  await ensureLocalDirs();

  const id = uuidv4();
  const originalExt = path.extname(originalName);
  const ext = getExtension(mime, originalExt);

  // Check if this is an image we can process
  const canProcess = isProcessableImage(mime);

  if (canProcess) {
    // Process image with variants
    try {
      const processed = await processImage(file, originalName, DEFAULT_SETTINGS);

      // Build filenames
      const baseFilename = processed.sanitizedName || "image";
      const shortId = processed.shortId;

      // Save original file
      const originalFilename = buildVariantFilename(baseFilename, shortId, "original", ext);
      const originalResult = await saveFile(file, originalFilename, "originals", mime);

      // Save variants
      const variants: MediaItem["variants"] = {};
      const variantNames = ["display", "large", "medium", "thumb"] as const;

      for (const variantName of variantNames) {
        const variant = processed.variants[variantName];
        if (variant) {
          const variantFilename = buildVariantFilename(baseFilename, shortId, variantName, ext);
          const variantResult = await saveFile(variant.buffer, variantFilename, "variants", mime);

          variants[variantName] = {
            filename: variantFilename,
            path: variantResult.path,
            url: variantResult.url,
            width: variant.width,
            height: variant.height,
            size: variant.buffer.length,
          };
        }
      }

      // Default to original (client-compressed image)
      // Next.js Image component handles dynamic optimization at serve-time
      const activeVariant: MediaItem["activeVariant"] = "original";

      // Get primary URL based on active variant
      const primaryVariant = activeVariant === "original" ? null : variants[activeVariant];
      
      // If no variants were generated (image too small), save as primary
      let primaryPath = primaryVariant?.path || originalResult.path;
      let primaryUrl = primaryVariant?.url || originalResult.url;
      
      if (!primaryVariant) {
        const noVariantFilename = buildVariantFilename(baseFilename, shortId, null, ext);
        const noVariantResult = await saveFile(file, noVariantFilename, "", mime);
        primaryPath = noVariantResult.path;
        primaryUrl = noVariantResult.url;
      }

      const item: MediaItem = {
        id,
        filename: primaryVariant?.filename || buildVariantFilename(baseFilename, shortId, null, ext),
        originalName,
        slug: `${baseFilename}-${shortId}`,
        path: primaryPath,
        url: primaryUrl,
        mime,
        size: primaryVariant?.size || file.length,
        width: primaryVariant?.width || processed.original.width,
        height: primaryVariant?.height || processed.original.height,
        original: {
          filename: originalFilename,
          path: originalResult.path,
          url: originalResult.url,
          width: processed.original.width,
          height: processed.original.height,
          size: processed.original.size,
        },
        variants: Object.keys(variants).length > 0 ? variants : undefined,
        activeVariant,
        title: sanitizeFilename(originalName).replace(/-/g, " "),
        alt: "",
        createdAt: new Date().toISOString(),
        hash: processed.hash,
      };

      // Add to index
      const index = await loadIndex();
      index.items.push(item);
      await saveIndex(index, `Upload media: ${item.title}`);

      return { item };
    } catch (error) {
      console.error("Image processing error:", error);
      // Fall through to non-processed upload
    }
  }

  // Non-image or failed processing: save without variants
  const sanitizedName = sanitizeFilename(originalName) || "file";
  const shortId = generateShortId();
  const filename = buildVariantFilename(sanitizedName, shortId, null, ext);
  
  const fileResult = await saveFile(file, filename, "", mime);

  // Get dimensions for video or non-processed images
  const dimensions = await getImageDimensions(file);

  const item: MediaItem = {
    id,
    filename,
    originalName,
    slug: `${sanitizedName}-${shortId}`,
    path: fileResult.path,
    url: fileResult.url,
    mime,
    size: file.length,
    width: dimensions?.width,
    height: dimensions?.height,
    original: {
      filename,
      path: fileResult.path,
      url: fileResult.url,
      width: dimensions?.width || 0,
      height: dimensions?.height || 0,
      size: file.length,
    },
    activeVariant: "original",
    title: sanitizedName.replace(/-/g, " "),
    alt: "",
    createdAt: new Date().toISOString(),
    hash: generateFileHash(file),
  };

  // Add to index
  const index = await loadIndex();
  index.items.push(item);
  await saveIndex(index, `Upload media: ${item.title}`);

  return { item };
}

/**
 * Update media metadata
 */
export async function updateMedia(
  id: string,
  updates: {
    alt?: string;
    title?: string;
    caption?: string;
    description?: string;
    activeVariant?: MediaItem["activeVariant"];
  }
): Promise<{ item?: MediaItem; error?: string }> {
  const index = await loadIndex();
  const itemIndex = index.items.findIndex((item) => item.id === id);

  if (itemIndex === -1) {
    return { error: "Media not found" };
  }

  const item = index.items[itemIndex];

  // Update fields
  if (updates.alt !== undefined) item.alt = updates.alt;
  if (updates.title !== undefined) item.title = updates.title;
  if (updates.caption !== undefined) item.caption = updates.caption;
  if (updates.description !== undefined) item.description = updates.description;

  // Update active variant and primary URL
  if (updates.activeVariant !== undefined && updates.activeVariant !== item.activeVariant) {
    item.activeVariant = updates.activeVariant;

    if (updates.activeVariant === "original") {
      item.url = item.original.url;
      item.path = item.original.path;
      item.width = item.original.width;
      item.height = item.original.height;
      item.size = item.original.size;
    } else if (item.variants?.[updates.activeVariant]) {
      const variant = item.variants[updates.activeVariant] as ImageVariant;
      item.url = variant.url;
      item.path = variant.path;
      item.width = variant.width;
      item.height = variant.height;
      item.size = variant.size;
    }
  }

  item.updatedAt = new Date().toISOString();
  index.items[itemIndex] = item;

  await saveIndex(index, `Update media: ${item.title}`);

  return { item: index.items[itemIndex] };
}

/**
 * Delete a media item and all its variants
 */
export async function deleteMedia(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const index = await loadIndex();
  const item = index.items.find((item) => item.id === id);

  if (!item) {
    return { success: false, error: "Media not found" };
  }

  // Collect all URLs/paths to delete
  const filesToDelete: string[] = [];

  // For Blob storage, we need URLs; for local, we need paths
  const useUrl = shouldUseBlob();

  // Original
  if (item.original) {
    filesToDelete.push(useUrl ? item.original.url : item.original.path);
  }

  // Variants
  if (item.variants) {
    for (const variant of Object.values(item.variants)) {
      if (variant) {
        filesToDelete.push(useUrl ? variant.url : variant.path);
      }
    }
  }

  // Primary file (if different from above)
  const primaryFile = useUrl ? item.url : item.path;
  if (primaryFile && !filesToDelete.includes(primaryFile)) {
    filesToDelete.push(primaryFile);
  }

  // Delete all files
  if (shouldUseBlob()) {
    // Batch delete from Blob
    const blobUrls = filesToDelete.filter((f) => f.startsWith("http"));
    if (blobUrls.length > 0) {
      await deleteMultipleFromBlob(blobUrls);
    }
  } else {
    // Delete from local filesystem
    for (const filePath of filesToDelete) {
      await deleteFile(filePath);
    }
  }

  // Remove from index
  index.items = index.items.filter((i) => i.id !== id);
  await saveIndex(index, `Delete media: ${item.title}`);

  return { success: true };
}

/**
 * Restore media to original size
 */
export async function restoreToOriginal(
  id: string
): Promise<{ item?: MediaItem; error?: string }> {
  return updateMedia(id, { activeVariant: "original" });
}

/**
 * Get media URL for a specific variant
 */
export function getMediaUrl(
  item: MediaItem,
  variant: "original" | "display" | "large" | "medium" | "thumb" = "large"
): string {
  if (variant === "original") {
    return item.original.url;
  }

  if (item.variants?.[variant]) {
    return item.variants[variant]!.url;
  }

  // Fallback to primary URL
  return item.url;
}
