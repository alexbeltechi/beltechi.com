/**
 * Vercel Blob Storage
 * 
 * Handles file storage using Vercel Blob when BLOB_READ_WRITE_TOKEN is configured.
 * Falls back to local filesystem in development.
 */

import { put, del } from "@vercel/blob";

/**
 * Check if Vercel Blob storage should be used
 */
export function shouldUseBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Upload a file to Vercel Blob
 */
export async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  options: {
    contentType: string;
    folder?: string;
  }
): Promise<{ url: string; pathname: string }> {
  const pathname = options.folder
    ? `${options.folder}/${filename}`
    : filename;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: options.contentType,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}

/**
 * Delete a file from Vercel Blob
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error(`Failed to delete from blob: ${url}`, error);
    // Don't throw - file might already be deleted
  }
}

/**
 * Delete multiple files from Vercel Blob
 */
export async function deleteMultipleFromBlob(urls: string[]): Promise<void> {
  try {
    await del(urls);
  } catch (error) {
    console.error(`Failed to delete multiple files from blob`, error);
    // Don't throw - files might already be deleted
  }
}
