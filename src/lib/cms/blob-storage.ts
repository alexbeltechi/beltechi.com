/**
 * Vercel Blob Storage
 * 
 * Handles media uploads to Vercel Blob in production.
 * Falls back to local filesystem in development.
 */

import { put, del, list } from "@vercel/blob";

export interface BlobUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

/**
 * Check if Vercel Blob is configured
 */
export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Check if we should use Blob storage
 */
export function shouldUseBlob(): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  const forceBlob = process.env.USE_BLOB_STORAGE === "true";
  return (isProduction || forceBlob) && isBlobConfigured();
}

/**
 * Upload a file to Vercel Blob
 */
export async function uploadToBlob(
  file: Buffer | Blob | File,
  filename: string,
  options?: {
    contentType?: string;
    folder?: string;
    access?: "public";
  }
): Promise<BlobUploadResult> {
  const pathname = options?.folder
    ? `${options.folder}/${filename}`
    : filename;

  const blob = await put(pathname, file, {
    access: options?.access || "public",
    contentType: options?.contentType,
  });

  // Get size from the file if it's a Buffer, or estimate from blob
  const size = file instanceof Buffer ? file.length : 0;

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
    size,
  };
}

/**
 * Delete a file from Vercel Blob
 */
export async function deleteFromBlob(url: string): Promise<void> {
  await del(url);
}

/**
 * Delete multiple files from Vercel Blob
 */
export async function deleteMultipleFromBlob(urls: string[]): Promise<void> {
  await del(urls);
}

/**
 * List files in Vercel Blob
 */
export async function listBlobFiles(options?: {
  prefix?: string;
  limit?: number;
  cursor?: string;
}): Promise<{
  blobs: Array<{
    url: string;
    pathname: string;
    size: number;
    uploadedAt: Date;
  }>;
  cursor?: string;
  hasMore: boolean;
}> {
  const result = await list({
    prefix: options?.prefix,
    limit: options?.limit,
    cursor: options?.cursor,
  });

  return {
    blobs: result.blobs,
    cursor: result.cursor,
    hasMore: result.hasMore,
  };
}

/**
 * Generate a unique blob pathname
 */
export function generateBlobPath(
  filename: string,
  folder: "originals" | "variants" = "originals"
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split(".").pop() || "";
  const baseName = filename.replace(/\.[^/.]+$/, "");
  
  return `uploads/${folder}/${baseName}-${timestamp}-${random}.${ext}`;
}

