/**
 * Media Management
 * 
 * Handles media uploads and management.
 * - Files: Vercel Blob (production) or local filesystem (development)
 * - Metadata: Direct MongoDB storage (WordPress-style - one document per media item)
 */

import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { MediaItem, ImageVariant } from "./types";
import {
  sanitizeFilename,
  generateShortId,
  generateFileHash,
  processImage,
  buildVariantFilename,
  isProcessableImage,
  getImageDimensions,
  generateBlurPlaceholder,
  DEFAULT_SETTINGS,
} from "./image-processing";
import { extractVideoThumbnail, getVideoMetadata } from "./video-processing";
import { listEntries, updateEntry } from "@/lib/db/entries";
import { 
  shouldUseBlob, 
  uploadToBlob, 
  deleteFromBlob,
  deleteMultipleFromBlob 
} from "./blob-storage";

// Direct MongoDB media operations (WordPress-style)
import * as mediaDb from "@/lib/db/media";

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
 * List all media items (direct MongoDB query)
 */
export async function listMedia(options: {
  limit?: number;
  offset?: number;
  mime?: string;
} = {}): Promise<{ items: MediaItem[]; total: number }> {
  return mediaDb.listMedia({
    limit: options.limit,
    offset: options.offset,
    mime: options.mime,
    sortBy: "createdAt",
    sortDir: "desc",
  });
}

/**
 * Get a single media item by ID (direct MongoDB query)
 */
export async function getMedia(id: string): Promise<MediaItem | null> {
  return mediaDb.getMediaById(id);
}

/**
 * Get multiple media items by IDs (direct MongoDB query)
 */
export async function getMediaByIds(ids: string[]): Promise<MediaItem[]> {
  return mediaDb.getMediaByIds(ids);
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

      // Build variants object
      const variants: MediaItem["variants"] = {};
      
      // IMPORTANT: Store display variant info so it's not lost when switching to thumb
      variants.display = {
        filename: primaryFilename,
        path: primaryResult.path,
        url: primaryResult.url,
        width: displayVariant.width,
        height: displayVariant.height,
        size: displayVariant.buffer.length,
      };

      // Save thumb variant
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

      // Generate blur placeholder (tiny base64 image for instant loading)
      const blurDataURL = await generateBlurPlaceholder(file);

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
        blurDataURL, // Tiny placeholder for instant loading
      };

      // Save to MongoDB (direct document insertion)
      await mediaDb.createMedia(item);

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

  // Check if this is a video and generate thumbnail
  const isVideo = mime.startsWith("video/");
  let poster: MediaItem["poster"] = undefined;
  let videoMetadata: { width: number; height: number; duration: number } | undefined;

  if (isVideo) {
    try {
      // Get video metadata (dimensions, duration)
      videoMetadata = await getVideoMetadata(file) || undefined;
      
      // Extract thumbnail from first frame
      const thumbnail = await extractVideoThumbnail(file, {
        timestamp: 0.5, // 0.5 seconds in to avoid black frames
        maxWidth: 768,
        quality: 5,
      });
      
      if (thumbnail) {
        // Save the thumbnail in variants folder
        const posterFilename = buildVariantFilename(sanitizedName, shortId, "poster", ".jpg");
        const posterResult = await saveFile(thumbnail.buffer, posterFilename, "variants", "image/jpeg");
        
        poster = {
          url: posterResult.url,
          width: thumbnail.width,
          height: thumbnail.height,
        };
      }
    } catch (error) {
      console.error("Video thumbnail extraction failed:", error);
      // Continue without poster - not a critical error
    }
  }

  const item: MediaItem = {
    id,
    filename,
    originalName,
    slug: `${sanitizedName}-${shortId}`,
    path: fileResult.path,
    url: fileResult.url,
    mime,
    size: file.length,
    width: isVideo ? videoMetadata?.width : dimensions?.width,
    height: isVideo ? videoMetadata?.height : dimensions?.height,
    duration: isVideo ? videoMetadata?.duration : undefined,
    original: {
      filename,
      path: fileResult.path,
      url: fileResult.url,
      width: (isVideo ? videoMetadata?.width : dimensions?.width) || 0,
      height: (isVideo ? videoMetadata?.height : dimensions?.height) || 0,
      size: file.length,
    },
    poster,
    activeVariant: "original",
    title: sanitizedName.replace(/-/g, " "),
    alt: "",
    createdAt: new Date().toISOString(),
    hash: generateFileHash(file),
  };

  // Save to MongoDB (direct document insertion)
  await mediaDb.createMedia(item);

  return { item };
}

/**
 * Update media metadata (direct MongoDB update)
 */
export async function updateMedia(
  id: string,
  updates: {
    alt?: string;
    title?: string;
    caption?: string;
    description?: string;
    activeVariant?: MediaItem["activeVariant"];
    tags?: string[];
  }
): Promise<{ item?: MediaItem; error?: string }> {
  // Get existing item
  const item = await mediaDb.getMediaById(id);
  if (!item) {
    return { error: "Media not found" };
  }

  // Prepare updates
  const mediaUpdates: Partial<MediaItem> = {};

  if (updates.alt !== undefined) mediaUpdates.alt = updates.alt;
  if (updates.title !== undefined) mediaUpdates.title = updates.title;
  if (updates.caption !== undefined) mediaUpdates.caption = updates.caption;
  if (updates.description !== undefined) mediaUpdates.description = updates.description;
  if (updates.tags !== undefined) mediaUpdates.tags = updates.tags;

  // Handle active variant change
  if (updates.activeVariant !== undefined && updates.activeVariant !== item.activeVariant) {
    // IMPORTANT: Before changing activeVariant, preserve current display values
    // if variants.display doesn't exist yet (for old uploads)
    if (item.activeVariant === "display" && !item.variants?.display && item.width && item.height && item.size) {
      if (!item.variants) item.variants = {};
      item.variants.display = {
        filename: item.filename,
        path: item.path,
        url: item.url,
        width: item.width,
        height: item.height,
        size: item.size,
      };
      mediaUpdates.variants = item.variants;
    }

    mediaUpdates.activeVariant = updates.activeVariant;

    if (updates.activeVariant === "original" && item.original) {
      mediaUpdates.url = item.original.url;
      mediaUpdates.path = item.original.path;
      if (item.original.width !== undefined) mediaUpdates.width = item.original.width;
      if (item.original.height !== undefined) mediaUpdates.height = item.original.height;
      if (item.original.size !== undefined) mediaUpdates.size = item.original.size;
    } else if (updates.activeVariant !== "original") {
      const variantKey = updates.activeVariant as "display" | "large" | "medium" | "thumb";
      const variant = item.variants?.[variantKey];
      if (variant) {
        mediaUpdates.url = variant.url;
        mediaUpdates.path = variant.path;
        mediaUpdates.width = variant.width;
        mediaUpdates.height = variant.height;
        mediaUpdates.size = variant.size;
      }
    }
  }

  // Update in MongoDB
  const updatedItem = await mediaDb.updateMedia(id, mediaUpdates);
  
  if (!updatedItem) {
    return { error: "Failed to update media" };
  }

  return { item: updatedItem };
}

/**
 * Delete a media item and all its variants
 */
export async function deleteMedia(
  id: string
): Promise<{ success: boolean; error?: string; updatedEntries?: number }> {
  const item = await mediaDb.getMediaById(id);

  if (!item) {
    return { success: false, error: "Media not found" };
  }

  // First, clean up all references to this media in posts/articles
  const { updatedCount } = await removeMediaReferences(id);

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

  // Video poster thumbnail
  if (item.poster?.url) {
    filesToDelete.push(item.poster.url);
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

  // Remove from MongoDB
  await mediaDb.deleteMedia(id);

  return { success: true, updatedEntries: updatedCount };
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
    const articleData = article.data as { coverImage?: string };

    // Check coverImage
    if (articleData.coverImage === oldMediaId) {
      articleData.coverImage = newMediaId;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await updateEntry("articles", article.slug, { data: articleData });
      updatedCount++;
    }
  }

  return { updatedCount };
}

/**
 * Remove media references from all entries (posts/articles)
 * Used when deleting media to clean up references and prevent broken links
 */
export async function removeMediaReferences(
  mediaId: string
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;

  // Update posts
  const { entries: posts } = await listEntries("posts");
  for (const post of posts) {
    let needsUpdate = false;
    const postData = post.data as { media?: string[]; coverMediaId?: string };

    // Remove from media array
    if (postData.media && Array.isArray(postData.media)) {
      const originalLength = postData.media.length;
      postData.media = postData.media.filter((id: string) => id !== mediaId);
      if (postData.media.length !== originalLength) {
        needsUpdate = true;
      }
    }

    // Update coverMediaId if it was the deleted media
    if (postData.coverMediaId === mediaId) {
      // Set to first remaining media, or undefined if none left
      postData.coverMediaId = postData.media?.[0] || undefined;
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
    const articleData = article.data as { 
      coverImage?: string;
      blocks?: Array<{ type: string; id: string; mediaIds?: string[]; mediaId?: string }>;
    };

    // Check coverImage
    if (articleData.coverImage === mediaId) {
      articleData.coverImage = undefined;
      needsUpdate = true;
    }

    // Check blocks for gallery and image blocks
    if (articleData.blocks && Array.isArray(articleData.blocks)) {
      for (const block of articleData.blocks) {
        // Gallery blocks have mediaIds array
        if (block.type === "gallery" && block.mediaIds && Array.isArray(block.mediaIds)) {
          const originalLength = block.mediaIds.length;
          block.mediaIds = block.mediaIds.filter((id: string) => id !== mediaId);
          if (block.mediaIds.length !== originalLength) {
            needsUpdate = true;
          }
        }
        
        // Image blocks have a single mediaId
        if (block.type === "image" && block.mediaId === mediaId) {
          block.mediaId = undefined;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await updateEntry("articles", article.slug, { data: articleData });
      updatedCount++;
    }
  }

  return { updatedCount };
}
