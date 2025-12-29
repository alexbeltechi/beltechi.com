/**
 * Diagnostic Script: Find Orphaned Media
 * 
 * This script:
 * 1. Gets all posts from MongoDB
 * 2. Extracts all media IDs referenced by posts
 * 3. Checks which media IDs exist in the media collection
 * 4. Reports orphaned media IDs (referenced by posts but not in media collection)
 * 
 * Run with: npx ts-node --skipProject scripts/diagnose-orphan-media.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment");
  process.exit(1);
}

interface PostData {
  title?: string;
  media?: string[];
  coverMediaId?: string;
}

interface PostEntry {
  slug: string;
  data: PostData;
}

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  [key: string]: unknown;
}

async function diagnose() {
  console.log("🔍 Diagnosing orphaned media...\n");

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
  console.log("📊 Analyzing media references...");
  const allMediaIds = new Set<string>();
  const postMediaMap = new Map<string, { title: string; mediaIds: string[] }>();

  for (const post of posts) {
    const postData = post.data as PostData;
    const mediaIds: string[] = [];

    // Get media array
    if (postData.media && Array.isArray(postData.media)) {
      postData.media.forEach((id) => {
        allMediaIds.add(id);
        mediaIds.push(id);
      });
    }

    // Get coverMediaId
    if (postData.coverMediaId) {
      allMediaIds.add(postData.coverMediaId);
      if (!mediaIds.includes(postData.coverMediaId)) {
        mediaIds.push(postData.coverMediaId);
      }
    }

    if (mediaIds.length > 0) {
      postMediaMap.set(post.slug as string, {
        title: postData.title || post.slug as string,
        mediaIds,
      });
    }
  }

  console.log(`✓ Found ${allMediaIds.size} unique media IDs referenced by posts\n`);

  // Step 3: Check which media IDs exist in the media collection
  console.log("🔎 Checking media collection...");
  const existingMedia = await mediaCollection
    .find({ id: { $in: Array.from(allMediaIds) } })
    .toArray();
  
  const existingMediaIds = new Set(existingMedia.map((m) => m.id as string));
  console.log(`✓ Found ${existingMediaIds.size} matching media documents\n`);

  // Step 4: Find orphaned media IDs
  const orphanedMediaIds = Array.from(allMediaIds).filter(
    (id) => !existingMediaIds.has(id)
  );

  console.log("=" .repeat(60));
  console.log("📋 DIAGNOSIS RESULTS");
  console.log("=" .repeat(60));

  console.log(`\nTotal posts: ${posts.length}`);
  console.log(`Posts with media: ${postMediaMap.size}`);
  console.log(`Total unique media IDs referenced: ${allMediaIds.size}`);
  console.log(`Media documents found in DB: ${existingMediaIds.size}`);
  console.log(`ORPHANED media IDs: ${orphanedMediaIds.length}`);

  if (orphanedMediaIds.length > 0) {
    console.log("\n⚠️  ORPHANED MEDIA DETAILS:");
    console.log("-".repeat(60));

    // Group orphaned IDs by post
    const orphanedByPost = new Map<string, string[]>();
    
    for (const [slug, info] of postMediaMap) {
      const orphaned = info.mediaIds.filter((id) => orphanedMediaIds.includes(id));
      if (orphaned.length > 0) {
        orphanedByPost.set(slug, orphaned);
      }
    }

    for (const [slug, orphaned] of orphanedByPost) {
      const postInfo = postMediaMap.get(slug)!;
      console.log(`\n📝 "${postInfo.title}" (${slug})`);
      console.log(`   Missing ${orphaned.length} media item(s):`);
      orphaned.forEach((id) => {
        console.log(`   - ${id}`);
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("💡 SOLUTION OPTIONS:");
    console.log("=".repeat(60));
    console.log(`
1. If these images exist in Vercel Blob, you can:
   - Run the fix-orphan-media.ts script to re-register them
   - Or manually upload them again through the admin

2. If the images are lost:
   - Remove the broken media references from posts
   - Upload new images through the admin

3. To check Vercel Blob storage:
   - Go to your Vercel dashboard > Storage > Blob
   - Search for the filenames or browse the uploads folder
`);
  } else {
    console.log("\n✅ All media references are valid! No orphaned media found.");
  }

  // Step 5: Check for media documents without valid references (unused media)
  console.log("\n" + "=".repeat(60));
  console.log("📦 CHECKING FOR UNUSED MEDIA IN DATABASE");
  console.log("=".repeat(60));

  const allMediaDocs = await mediaCollection
    .find({ id: { $exists: true } })
    .toArray();

  const usedMediaIds = new Set(allMediaIds);
  const unusedMedia = allMediaDocs.filter(
    (m) => !usedMediaIds.has(m.id as string)
  );

  console.log(`\nTotal media in database: ${allMediaDocs.length}`);
  console.log(`Media used by posts: ${usedMediaIds.size}`);
  console.log(`Unused media: ${unusedMedia.length}`);

  if (unusedMedia.length > 0 && unusedMedia.length <= 10) {
    console.log("\nUnused media items:");
    unusedMedia.forEach((m) => {
      console.log(`   - ${m.id}: ${m.filename || m.originalName}`);
    });
  }

  // Show sample post data for debugging
  console.log("\n" + "=".repeat(60));
  console.log("🔬 SAMPLE POST DATA");
  console.log("=".repeat(60));

  const samplePosts = posts.slice(0, 3);
  for (const post of samplePosts) {
    console.log(`\n📝 "${post.data?.title || post.slug}"`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Media IDs: ${JSON.stringify(post.data?.media || [])}`);
    console.log(`   Cover ID: ${post.data?.coverMediaId || "(none)"}`);
  }

  await client.close();
  console.log("\n✅ Diagnosis complete!");
}

diagnose().catch((error) => {
  console.error("Diagnosis failed:", error);
  process.exit(1);
});

