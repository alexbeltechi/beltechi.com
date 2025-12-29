import { NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";
import { list } from "@vercel/blob";

interface BlobInfo {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

/**
 * POST /api/admin/media/fix-orphans
 * 
 * Attempts to fix orphaned media by:
 * 1. Finding orphaned media IDs (referenced by posts but not in media collection)
 * 2. Looking up matching files in Vercel Blob storage
 * 3. Creating MediaItem documents for matches
 */
export async function POST() {
  try {
    const db = await getDb();
    const entriesCollection = db.collection(Collections.ENTRIES);
    const mediaCollection = db.collection(Collections.MEDIA);

    // Step 1: Get all posts and collect media IDs
    const posts = await entriesCollection
      .find({ collection: "posts" })
      .toArray();

    const allMediaIds = new Set<string>();
    for (const post of posts) {
      if (post.data?.media && Array.isArray(post.data.media)) {
        post.data.media.forEach((id: string) => allMediaIds.add(id));
      }
      if (post.data?.coverMediaId) {
        allMediaIds.add(post.data.coverMediaId);
      }
    }

    // Step 2: Find orphaned media IDs
    const existingMedia = await mediaCollection
      .find({ id: { $in: Array.from(allMediaIds) } })
      .toArray();
    const existingMediaIds = new Set(existingMedia.map((m) => m.id as string));
    const orphanedMediaIds = Array.from(allMediaIds).filter(
      (id) => !existingMediaIds.has(id)
    );

    if (orphanedMediaIds.length === 0) {
      return NextResponse.json({
        message: "No orphaned media found. Nothing to fix!",
        fixed: 0,
        unmatched: [],
      });
    }

    // Step 3: List blob files (if token is available)
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobFiles = new Map<string, BlobInfo>();

    if (blobToken) {
      try {
        let cursor: string | undefined;
        do {
          const response = await list({
            cursor,
            limit: 1000,
            token: blobToken,
          });

          for (const blob of response.blobs) {
            const filename = blob.pathname.split("/").pop() || blob.pathname;
            blobFiles.set(filename, {
              url: blob.url,
              pathname: blob.pathname,
              size: blob.size,
              uploadedAt: blob.uploadedAt,
            });
            // Also index by full pathname
            blobFiles.set(blob.pathname, {
              url: blob.url,
              pathname: blob.pathname,
              size: blob.size,
              uploadedAt: blob.uploadedAt,
            });
          }

          cursor = response.cursor;
        } while (cursor);
      } catch (error) {
        console.error("Failed to list blob files:", error);
      }
    }

    // Step 4: Try to match orphaned IDs to blob files
    const matches: Array<{ id: string; blob: BlobInfo }> = [];
    const unmatched: string[] = [];

    for (const id of orphanedMediaIds) {
      let matchedBlob: BlobInfo | undefined;

      // Strategy 1: ID contains filename pattern (e.g., "image-name-abc123")
      for (const [key, blobInfo] of blobFiles) {
        // Extract base name from blob (remove extension and short ID)
        const blobBase = key
          .replace(/\.[^.]+$/, "")
          .replace(/-[a-f0-9]{4}$/i, "")
          .toLowerCase();
        
        // Check if ID matches or contains the blob base name
        const idLower = id.toLowerCase();
        if (
          key.includes(id) ||
          id.includes(blobBase) ||
          blobInfo.url.includes(id)
        ) {
          matchedBlob = blobInfo;
          break;
        }
      }

      // Strategy 2: ID is a URL
      if (!matchedBlob && id.startsWith("http")) {
        matchedBlob = {
          url: id,
          pathname: id.split("/").slice(-2).join("/"),
          size: 0,
          uploadedAt: new Date(),
        };
      }

      if (matchedBlob) {
        matches.push({ id, blob: matchedBlob });
      } else {
        unmatched.push(id);
      }
    }

    // Step 5: Create MediaItem documents for matches
    let created = 0;
    const createdItems: Array<{ id: string; filename: string }> = [];

    for (const match of matches) {
      const filename =
        match.blob.pathname.split("/").pop() || match.blob.pathname;
      const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
      const titleFromName = nameWithoutExt
        .replace(/-[a-f0-9]{4}$/i, "")
        .replace(/-/g, " ");

      const ext = filename.split(".").pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        avif: "image/avif",
        mp4: "video/mp4",
        webm: "video/webm",
        mov: "video/quicktime",
      };

      const mediaItem = {
        id: match.id,
        filename,
        originalName: filename,
        slug: nameWithoutExt,
        path: match.blob.pathname,
        url: match.blob.url,
        mime: mimeMap[ext || ""] || "image/jpeg",
        size: match.blob.size,
        title: titleFromName,
        alt: "",
        activeVariant: "original",
        createdAt: match.blob.uploadedAt.toISOString(),
      };

      try {
        // Check if already exists (in case of race condition)
        const existing = await mediaCollection.findOne({ id: match.id });
        if (!existing) {
          await mediaCollection.insertOne(mediaItem);
          created++;
          createdItems.push({ id: match.id, filename });
        }
      } catch (error) {
        console.error(`Failed to create media item ${match.id}:`, error);
      }
    }

    return NextResponse.json({
      message: `Fixed ${created} orphaned media items`,
      fixed: created,
      createdItems,
      unmatched,
      totalOrphaned: orphanedMediaIds.length,
    });
  } catch (error) {
    console.error("Fix orphans error:", error);
    return NextResponse.json(
      { error: "Failed to fix orphaned media" },
      { status: 500 }
    );
  }
}

