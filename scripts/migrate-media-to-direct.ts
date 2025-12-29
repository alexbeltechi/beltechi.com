/**
 * Migration Script: Convert Media Index to Direct MongoDB Documents
 * 
 * This script:
 * 1. Reads the existing media index (stored as JSON blob via storage adapter)
 * 2. Converts each media item to an individual MongoDB document
 * 3. Removes the old storage adapter document
 * 
 * Run with: npx ts-node --skipProject scripts/migrate-media-to-direct.ts
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
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  variants?: Record<string, unknown>;
  original?: Record<string, unknown>;
  activeVariant?: string;
  [key: string]: unknown;
}

async function migrate() {
  console.log("🚀 Starting media migration to direct MongoDB storage...\n");

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  console.log("✓ Connected to MongoDB\n");

  const db = client.db("beltechi-cms");
  const mediaCollection = db.collection("media");

  // Step 1: Check for existing storage adapter document
  console.log("📦 Looking for existing storage adapter data...");
  const storageDoc = await mediaCollection.findOne({ 
    _filePath: "content/media/index.json" 
  });

  if (!storageDoc) {
    console.log("⚠️  No storage adapter document found.");
    console.log("   Checking if media is already in direct format...\n");

    const directCount = await mediaCollection.countDocuments({ 
      id: { $exists: true },
      _filePath: { $exists: false }
    });

    if (directCount > 0) {
      console.log(`✓ Found ${directCount} media items already in direct format.`);
      console.log("   Migration may have already been completed.\n");
    } else {
      console.log("❌ No media data found at all.");
      console.log("   You may need to re-upload your images.\n");
    }

    await client.close();
    return;
  }

  // Step 2: Parse the JSON content
  console.log("✓ Found storage adapter document");
  
  let mediaItems: MediaItem[] = [];
  try {
    const parsed = JSON.parse(storageDoc.content as string);
    mediaItems = parsed.items || [];
    console.log(`✓ Parsed ${mediaItems.length} media items from JSON blob\n`);
  } catch (error) {
    console.error("❌ Failed to parse media index JSON:", error);
    await client.close();
    process.exit(1);
  }

  if (mediaItems.length === 0) {
    console.log("⚠️  No media items to migrate.");
    await client.close();
    return;
  }

  // Step 3: Insert each media item as individual document
  console.log("📥 Migrating media items to individual documents...");
  
  let migrated = 0;
  let skipped = 0;

  for (const item of mediaItems) {
    // Check if already exists (avoid duplicates)
    const existing = await mediaCollection.findOne({ id: item.id });
    
    if (existing && !existing._filePath) {
      // Already exists as direct document
      skipped++;
      continue;
    }

    // Insert as new document
    await mediaCollection.insertOne(item);
    migrated++;
    
    // Progress indicator
    if (migrated % 10 === 0) {
      console.log(`   Migrated ${migrated}/${mediaItems.length}...`);
    }
  }

  console.log(`\n✓ Migrated ${migrated} media items`);
  if (skipped > 0) {
    console.log(`   (${skipped} already existed, skipped)`);
  }

  // Step 4: Remove the old storage adapter document
  console.log("\n🧹 Removing old storage adapter document...");
  await mediaCollection.deleteOne({ _filePath: "content/media/index.json" });
  console.log("✓ Old storage adapter document removed");

  // Step 5: Verify migration
  console.log("\n📊 Verifying migration...");
  const finalCount = await mediaCollection.countDocuments({ 
    id: { $exists: true } 
  });
  console.log(`✓ Total media items in database: ${finalCount}`);

  // Show sample
  const sample = await mediaCollection.findOne({ id: { $exists: true } });
  if (sample) {
    console.log("\n📷 Sample migrated document:");
    console.log(`   ID: ${sample.id}`);
    console.log(`   Filename: ${sample.filename}`);
    console.log(`   URL: ${sample.url}`);
    console.log(`   Tags: ${sample.tags?.join(", ") || "(none)"}`);
  }

  await client.close();
  console.log("\n✅ Migration complete!");
  console.log("\nNext steps:");
  console.log("1. Restart your dev server: npm run dev");
  console.log("2. Check admin/media page - images should appear");
  console.log("3. Deploy to Vercel: git add -A && git commit -m 'Direct MongoDB media' && git push");
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

