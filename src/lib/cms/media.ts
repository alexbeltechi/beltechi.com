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
import { listEntries, updateEntry } from "./entries";
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
  try {
    console.log(`[Media] Saving index to: ${MEDIA_INDEX_PATH}`);
    console.log(`[Media] Index has ${index.items.length} items`);
    await storage.write(
      MEDIA_INDEX_PATH,
      JSON.stringify(index, null, 2),
      message || "Update media index"
    );
    console.log(`[Media] Index saved successfully`);
  } catch (error) {
    console.error(`[Media] Failed to save index:`, error);
    throw error;
  }
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
    // Process image with variants - optimized WebP output
    try {
      const processed = await processImage(file, originalName, DEFAULT_SETTINGS);

      // Build filenames - use .webp extension for optimized images
      const baseFilename = processed.sanitizedName || "image";
      const shortId = processed.shortId;
      const outputExt = DEFAULT_SETTINGS.generateWebP ? ".webp" : ext;
      const outputMime = DEFAULT_SETTINGS.generateWebP ? "image/webp" : mime;

      // Get the display variant (primary optimized image)
      const displayVariant = processed.variants.display;
      if (!displayVariant) {
        throw new Error("Failed to generate display variant");
      }

      // Save primary file (optimized display variant, not original)
      const primaryFilename = buildVariantFilename(baseFilename, shortId, null, outputExt);
      const primaryResult = await saveFile(displayVariant.buffer, primaryFilename, "", outputMime);

      // Save thumb variant
      const variants: MediaItem["variants"] = {};
      const thumbVariant = processed.variants.thumb;
      if (thumbVariant) {
        const thumbFilename = buildVariantFilename(baseFilename, shortId, "thumb", outputExt);
        const thumbResult = await saveFile(thumbVariant.buffer, thumbFilename, "variants", outputMime);

        variants.thumb = {
          filename: thumbFilename,
          path: thumbResult.path,
          url: thumbResult.url,
          width: thumbVariant.width,
          height: thumbVariant.height,
          size: thumbVariant.buffer.length,
        };
      }

      const item: MediaItem = {
        id,
        filename: primaryFilename,
        originalName,
        slug: `${baseFilename}-${shortId}`,
        path: primaryResult.path,
        url: primaryResult.url,
        mime: outputMime,
        size: displayVariant.buffer.length,
        width: displayVariant.width,
        height: displayVariant.height,
        variants: Object.keys(variants).length > 0 ? variants : undefined,
        activeVariant: "display",
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

    if (updates.activeVariant === "original" && item.original) {
      item.url = item.original.url;
      item.path = item.original.path;
      item.width = item.original.width;
      item.height = item.original.height;
      item.size = item.original.size;
    } else if (updates.activeVariant !== "original") {
      const variantKey = updates.activeVariant as "display" | "large" | "medium" | "thumb";
      const variant = item.variants?.[variantKey];
      if (variant) {
        item.url = variant.url;
        item.path = variant.path;
        item.width = variant.width;
        item.height = variant.height;
        item.size = variant.size;
      }
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
  if (variant === "original" && item.original) {
    return item.original.url;
  }

  if (variant !== "original") {
    const variantKey = variant as "display" | "large" | "medium" | "thumb";
    if (item.variants?.[variantKey]) {
      return item.variants[variantKey]!.url;
    }
  }

  // Fallback to primary URL
  return item.url;
}

/**
 * Replace media references in all entries (posts/articles)
 * Used when replacing an image to maintain post associations
 */
export async function replaceMediaReferences(
  oldMediaId: string,
  newMediaId: string
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;

  // Update posts
  const { entries: posts } = await listEntries("posts");
  for (const post of posts) {
    let needsUpdate = false;
    const postData = post.data as { media?: string[]; coverMediaId?: string };

    // Check media array
    if (postData.media && Array.isArray(postData.media)) {
      const mediaIndex = postData.media.indexOf(oldMediaId);
      if (mediaIndex !== -1) {
        postData.media[mediaIndex] = newMediaId;
        needsUpdate = true;
      }
    }

    // Check coverMediaId
    if (postData.coverMediaId === oldMediaId) {
      postData.coverMediaId = newMediaId;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await updateEntry("posts", post.slug, { data: postData });
      updatedCount++;
    }
  }

  // Update articles
  const { entries: articles } = await listEntries("articles");
  for (const article of articles) {
    let needsUpdate = false;
    const articleData = article.data as { featuredImage?: string };

    // Check featuredImage
    if (articleData.featuredImage === oldMediaId) {
      articleData.featuredImage = newMediaId;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await updateEntry("articles", article.slug, { data: articleData });
      updatedCount++;
    }
  }

  return { updatedCount };
}
