/**
 * Fix Script: Re-register Orphaned Media from Vercel Blob
 * 
 * This script:
 * 1. Gets all posts and their media references
 * 2. For each orphaned media ID, checks if the post has a blob URL stored
 * 3. Creates MediaItem documents for orphaned blob images
 * 
 * IMPORTANT: This requires the posts to have stored blob URLs somewhere.
 * If the posts only have media IDs with no URLs, you'll need to manually 
 * upload the images again.
 * 
 * Run with: npx ts-node --skipProject scripts/fix-orphan-media.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { list } from "@vercel/blob";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment");
  process.exit(1);
}

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  slug: string;
  path: string;
  url: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  title: string;
  alt: string;
  activeVariant: string;
  createdAt: string;
  variants?: Record<string, unknown>;
  original?: Record<string, unknown>;
}

async function listBlobFiles(): Promise<Map<string, { url: string; size: number; uploadedAt: Date }>> {
  if (!BLOB_READ_WRITE_TOKEN) {
    console.log("⚠️  No BLOB_READ_WRITE_TOKEN found. Cannot list blob files.");
    return new Map();
  }

  console.log("📦 Listing files in Vercel Blob storage...");
  
  const fileMap = new Map<string, { url: string; size: number; uploadedAt: Date }>();
  let cursor: string | undefined;
  let totalFiles = 0;

  try {
    do {
      const response = await list({
        cursor,
        limit: 1000,
        token: BLOB_READ_WRITE_TOKEN,
      });

      for (const blob of response.blobs) {
        // Extract filename from pathname (e.g., "uploads/image-name-abc123.webp")
        const filename = blob.pathname.split("/").pop() || blob.pathname;
        fileMap.set(filename, {
          url: blob.url,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        });
        totalFiles++;
      }

      cursor = response.cursor;
    } while (cursor);

    console.log(`✓ Found ${totalFiles} files in Blob storage\n`);
  } catch (error) {
    console.error("❌ Failed to list blob files:", error);
  }

  return fileMap;
}

function extractFilenameFromId(id: string): string | null {
  // Some systems encode the filename in the ID
  // Try to extract it or return null
  return null;
}

function guessMimeType(filename: string): string {
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
  return mimeMap[ext || ""] || "image/jpeg";
}

function createMediaItemFromBlob(
  id: string,
  url: string,
  size: number,
  uploadedAt: Date
): MediaItem {
  // Extract filename from URL
  const urlParts = url.split("/");
  const filename = urlParts[urlParts.length - 1];
  
  // Clean up the filename for display
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  const titleFromName = nameWithoutExt
    .replace(/-[a-f0-9]{4}$/i, "") // Remove short ID suffix
    .replace(/-/g, " ");

  return {
    id,
    filename,
    originalName: filename,
    slug: nameWithoutExt,
    path: urlParts.slice(-2).join("/"), // e.g., "uploads/filename.webp"
    url,
    mime: guessMimeType(filename),
    size,
    title: titleFromName,
    alt: "",
    activeVariant: "original",
    createdAt: uploadedAt.toISOString(),
  };
}

async function fix() {
  console.log("🔧 Fixing orphaned media...\n");

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  console.log("✓ Connected to MongoDB\n");

  const db = client.db();
  const entriesCollection = db.collection("entries");
  const mediaCollection = db.collection("media");

  // Step 1: Get all posts
  console.log("📦 Fetching all posts...");
  const posts = await entriesCollection
    .find({ collection: "posts" })
    .toArray();
  console.log(`✓ Found ${posts.length} posts\n`);

  // Step 2: Collect all referenced media IDs
  const allMediaIds = new Set<string>();
  for (const post of posts) {
    if (post.data?.media && Array.isArray(post.data.media)) {
      post.data.media.forEach((id: string) => allMediaIds.add(id));
    }
    if (post.data?.coverMediaId) {
      allMediaIds.add(post.data.coverMediaId);
    }
  }

  // Step 3: Find which ones are orphaned
  const existingMedia = await mediaCollection
    .find({ id: { $in: Array.from(allMediaIds) } })
    .toArray();
  const existingMediaIds = new Set(existingMedia.map((m) => m.id as string));
  
  const orphanedMediaIds = Array.from(allMediaIds).filter(
    (id) => !existingMediaIds.has(id)
  );

  if (orphanedMediaIds.length === 0) {
    console.log("✅ No orphaned media found. Nothing to fix!");
    await client.close();
    return;
  }

  console.log(`⚠️  Found ${orphanedMediaIds.length} orphaned media IDs\n`);

  // Step 4: List all blob files
  const blobFiles = await listBlobFiles();

  if (blobFiles.size === 0) {
    console.log(`
❌ Could not retrieve blob file list.

You have two options:

1. Set BLOB_READ_WRITE_TOKEN in .env.local and run this script again.

2. Manually create the media documents. Here are the orphaned IDs:
${orphanedMediaIds.map((id) => `   - ${id}`).join("\n")}

You would need to:
- Find the corresponding blob URLs
- Create MediaItem documents in MongoDB with matching IDs
`);
    await client.close();
    return;
  }

  // Step 5: Try to match orphaned IDs to blob files
  console.log("🔍 Attempting to match orphaned IDs to blob files...\n");

  const matches: Array<{ id: string; blobFile: { url: string; size: number; uploadedAt: Date } }> = [];
  const unmatched: string[] = [];

  for (const id of orphanedMediaIds) {
    // Try different matching strategies:
    
    // 1. ID might be a UUID - check if any blob filename contains it
    let matchedBlob: { url: string; size: number; uploadedAt: Date } | undefined;
    
    for (const [filename, blobInfo] of blobFiles) {
      // Check if filename contains the ID or part of it
      if (filename.includes(id) || id.includes(filename.replace(/\.[^.]+$/, ""))) {
        matchedBlob = blobInfo;
        break;
      }
    }

    // 2. Check if ID itself is a URL
    if (!matchedBlob && id.startsWith("http")) {
      // ID is actually a URL
      const filename = id.split("/").pop() || "";
      const blobInfo = blobFiles.get(filename);
      if (blobInfo) {
        matchedBlob = blobInfo;
      } else {
        // URL exists but we'll use it directly
        matchedBlob = { url: id, size: 0, uploadedAt: new Date() };
      }
    }

    if (matchedBlob) {
      matches.push({ id, blobFile: matchedBlob });
    } else {
      unmatched.push(id);
    }
  }

  console.log(`Matched: ${matches.length}`);
  console.log(`Unmatched: ${unmatched.length}\n`);

  // Step 6: Create MediaItem documents for matches
  if (matches.length > 0) {
    console.log("📝 Creating media documents for matched files...\n");

    let created = 0;
    for (const match of matches) {
      const mediaItem = createMediaItemFromBlob(
        match.id,
        match.blobFile.url,
        match.blobFile.size,
        match.blobFile.uploadedAt
      );

      try {
        await mediaCollection.insertOne(mediaItem);
        console.log(`   ✓ Created: ${mediaItem.title} (${match.id})`);
        created++;
      } catch (error) {
        console.log(`   ✗ Failed: ${match.id} - ${error}`);
      }
    }

    console.log(`\n✅ Created ${created} media documents`);
  }

  // Report unmatched
  if (unmatched.length > 0) {
    console.log(`
⚠️  ${unmatched.length} media IDs could not be matched to blob files:
${unmatched.map((id) => `   - ${id}`).join("\n")}

These may need to be:
- Re-uploaded through the admin
- Or the posts updated to remove invalid references
`);
  }

  await client.close();
  console.log("\n✅ Fix complete!");
}

fix().catch((error) => {
  console.error("Fix failed:", error);
  process.exit(1);
});

