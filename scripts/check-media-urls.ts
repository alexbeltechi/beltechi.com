/**
 * Check Media URLs Script
 * 
 * Verifies that media items in MongoDB have valid, accessible URLs
 * 
 * Run with: npx tsx scripts/check-media-urls.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment");
  process.exit(1);
}

// Posts to check
const POSTS_TO_CHECK = ["kitra", "larisa", "still-life"];

async function checkMediaUrls() {
  console.log("🔍 Checking media URLs for specific posts...\n");

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  console.log("✓ Connected to MongoDB\n");

  const db = client.db();
  const entriesCollection = db.collection("entries");
  const mediaCollection = db.collection("media");

  for (const slug of POSTS_TO_CHECK) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📝 POST: ${slug.toUpperCase()}`);
    console.log("=".repeat(60));

    const post = await entriesCollection.findOne({ 
      collection: "posts", 
      slug 
    });

    if (!post) {
      console.log(`❌ Post not found: ${slug}`);
      continue;
    }

    console.log(`Title: ${post.data?.title || "(no title)"}`);
    console.log(`Status: ${post.status}`);
    console.log(`Media IDs: ${post.data?.media?.length || 0}`);
    console.log(`Cover ID: ${post.data?.coverMediaId || "(none)"}`);

    const mediaIds = post.data?.media || [];
    
    if (mediaIds.length === 0) {
      console.log("\n⚠️  No media attached to this post");
      continue;
    }

    console.log("\n📷 Media Items:");
    console.log("-".repeat(60));

    for (const mediaId of mediaIds) {
      const media = await mediaCollection.findOne({ id: mediaId });
      
      if (!media) {
        console.log(`\n❌ MISSING: ${mediaId}`);
        continue;
      }

      const isCover = mediaId === post.data?.coverMediaId;
      console.log(`\n${isCover ? "⭐" : "📷"} ${media.title || media.filename}`);
      console.log(`   ID: ${media.id}`);
      console.log(`   Filename: ${media.filename}`);
      console.log(`   URL: ${media.url}`);
      console.log(`   MIME: ${media.mime}`);
      console.log(`   Size: ${media.size ? `${(media.size / 1024).toFixed(1)} KB` : "unknown"}`);
      
      if (media.variants?.thumb) {
        console.log(`   Thumb: ${media.variants.thumb.url}`);
      }
      
      // Check if URL is accessible
      try {
        const response = await fetch(media.url, { method: "HEAD" });
        if (response.ok) {
          console.log(`   ✅ URL accessible (${response.status})`);
        } else {
          console.log(`   ❌ URL NOT accessible (${response.status})`);
        }
      } catch (error) {
        console.log(`   ❌ URL check failed: ${error}`);
      }
    }
  }

  // Also check total media count and sample some entries
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 OVERALL MEDIA COLLECTION STATUS");
  console.log("=".repeat(60));

  const totalMedia = await mediaCollection.countDocuments({ id: { $exists: true } });
  console.log(`\nTotal media items: ${totalMedia}`);

  // Sample 5 random media items
  const sample = await mediaCollection
    .find({ id: { $exists: true } })
    .limit(5)
    .toArray();

  console.log("\n📷 Sample media items:");
  for (const m of sample) {
    console.log(`\n   ${m.title || m.filename}`);
    console.log(`   URL: ${m.url}`);
  }

  await client.close();
  console.log("\n✅ Check complete!");
}

checkMediaUrls().catch((error) => {
  console.error("Check failed:", error);
  process.exit(1);
});

