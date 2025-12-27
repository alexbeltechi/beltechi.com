/**
 * Client-side Image Compression
 * 
 * Compresses images before upload to:
 * - Bypass Vercel's 4.5MB serverless function limit
 * - Reduce storage usage
 * - Speed up uploads (especially on mobile)
 * 
 * Uses portfolio-quality settings (4096px max, 92% quality)
 */

import imageCompression from "browser-image-compression";

// Portfolio-quality settings for photographers/designers
export const COMPRESSION_SETTINGS = {
  // Max dimension (longest edge) - supports 4K displays
  maxWidthOrHeight: 4096,
  // High quality for portfolio work (92% = near-lossless)
  quality: 0.92,
  // Max file size in MB (stay under Vercel's 4.5MB limit with buffer)
  maxSizeMB: 3.5,
  // Use WebWorker for better performance (doesn't block UI)
  useWebWorker: true,
  // Preserve EXIF orientation but strip GPS for privacy
  preserveExif: false,
  // File types we can compress
  fileType: "image/jpeg" as const,
};

// Size limits
export const SIZE_LIMITS = {
  // Vercel serverless function limit
  VERCEL_LIMIT_MB: 4.5,
  // Our safe limit (with buffer for overhead)
  SAFE_LIMIT_MB: 3.5,
  // Warning threshold
  WARNING_THRESHOLD_MB: 3,
};

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
  compressionRatio: number;
}

export interface CompressionProgress {
  fileName: string;
  progress: number; // 0-100
  status: "pending" | "compressing" | "done" | "error" | "skipped";
  originalSize?: number;
  compressedSize?: number;
  error?: string;
}

/**
 * Format bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if a file is an image that can be compressed
 */
export function isCompressibleImage(file: File): boolean {
  const compressibleTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  return compressibleTypes.includes(file.type.toLowerCase());
}

/**
 * Check if a file exceeds the safe upload limit
 */
export function exceedsSafeLimit(file: File): boolean {
  return file.size > SIZE_LIMITS.SAFE_LIMIT_MB * 1024 * 1024;
}

/**
 * Check if a file exceeds Vercel's hard limit
 */
export function exceedsVercelLimit(file: File): boolean {
  return file.size > SIZE_LIMITS.VERCEL_LIMIT_MB * 1024 * 1024;
}

/**
 * Compress a single image file
 */
export async function compressImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  const originalSize = file.size;

  // Skip non-compressible files (videos, etc.)
  if (!isCompressibleImage(file)) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      compressionRatio: 1,
    };
  }

  // Skip small files that don't need compression
  if (file.size < 500 * 1024) {
    // Less than 500KB
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      compressionRatio: 1,
    };
  }

  try {
    const options = {
      ...COMPRESSION_SETTINGS,
      onProgress: (progress: number) => {
        onProgress?.(Math.round(progress));
      },
    };

    // For PNG files, keep as PNG to preserve transparency
    if (file.type === "image/png") {
      delete (options as Record<string, unknown>).fileType;
    }

    const compressedFile = await imageCompression(file, options);

    // If compression made it larger (rare), use original
    if (compressedFile.size >= originalSize) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        wasCompressed: false,
        compressionRatio: 1,
      };
    }

    // Create a new File with the original name
    const resultFile = new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });

    return {
      file: resultFile,
      originalSize,
      compressedSize: resultFile.size,
      wasCompressed: true,
      compressionRatio: originalSize / resultFile.size,
    };
  } catch (error) {
    console.error("Compression failed:", error);
    // Return original file if compression fails
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      compressionRatio: 1,
    };
  }
}

/**
 * Compress multiple files with progress tracking
 */
export async function compressImages(
  files: File[],
  onFileProgress?: (fileName: string, progress: CompressionProgress) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];

  for (const file of files) {
    // Report starting
    onFileProgress?.(file.name, {
      fileName: file.name,
      progress: 0,
      status: isCompressibleImage(file) ? "compressing" : "skipped",
      originalSize: file.size,
    });

    const result = await compressImage(file, (progress) => {
      onFileProgress?.(file.name, {
        fileName: file.name,
        progress,
        status: "compressing",
        originalSize: file.size,
      });
    });

    results.push(result);

    // Report done
    onFileProgress?.(file.name, {
      fileName: file.name,
      progress: 100,
      status: "done",
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
    });
  }

  return results;
}

/**
 * Validate files before upload
 * Returns error message if validation fails, null if OK
 */
export function validateFilesForUpload(files: File[]): string | null {
  for (const file of files) {
    // Check for files that are too large even after potential compression
    if (file.size > 50 * 1024 * 1024) {
      // 50MB is too large to even try
      return `"${file.name}" is too large (${formatFileSize(file.size)}). Maximum file size is 50MB.`;
    }

    // Check for unsupported file types
    const supportedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!supportedTypes.includes(file.type.toLowerCase())) {
      return `"${file.name}" has an unsupported file type (${file.type || "unknown"}).`;
    }

    // Warn about large videos (can't compress these client-side)
    if (file.type.startsWith("video/") && exceedsVercelLimit(file)) {
      return `"${file.name}" is too large (${formatFileSize(file.size)}). Videos must be under ${SIZE_LIMITS.VERCEL_LIMIT_MB}MB.`;
    }
  }

  return null;
}

/**
 * Get upload error message from response status
 */
export function getUploadErrorMessage(status: number, fileName?: string): string {
  const fileRef = fileName ? `"${fileName}"` : "File";
  
  switch (status) {
    case 413:
      return `${fileRef} is too large. Please compress it or use a smaller file.`;
    case 400:
      return `${fileRef} could not be processed. Please try a different file.`;
    case 401:
    case 403:
      return "You don't have permission to upload files. Please log in again.";
    case 500:
      return "Server error. Please try again in a moment.";
    case 502:
    case 503:
    case 504:
      return "Server is temporarily unavailable. Please try again.";
    default:
      return `Failed to upload ${fileRef}. Please try again.`;
  }
}

