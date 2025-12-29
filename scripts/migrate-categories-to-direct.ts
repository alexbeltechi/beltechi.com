/**
 * Migration Script: Convert Categories to Direct MongoDB Documents
 * 
 * This script:
 * 1. Reads the existing categories (stored as JSON blob via storage adapter)
 * 2. Converts each category to an individual MongoDB document
 * 3. Removes the old storage adapter document
 * 
 * Run with: npx tsx scripts/migrate-categories-to-direct.ts
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

interface Category {
  id: string;
  slug: string;
  name: string;
  label: string;
  color: string;
  description?: string;
  parentId?: string;
  image?: string;
  order?: number;
  showOnHomepage?: boolean;
  seo?: {
    title?: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

async function migrate() {
  console.log("🚀 Starting categories migration to direct MongoDB storage...\n");

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  console.log("✓ Connected to MongoDB\n");

  const db = client.db("beltechi-cms");
  const categoriesCollection = db.collection("categories");

  // Step 1: Check for existing storage adapter document
  console.log("📦 Looking for existing storage adapter data...");
  const storageDoc = await categoriesCollection.findOne({ 
    _filePath: "content/categories.json" 
  });

  if (!storageDoc) {
    console.log("⚠️  No storage adapter document found.");
    console.log("   Checking if categories are already in direct format...\n");

    const directCount = await categoriesCollection.countDocuments({ 
      id: { $exists: true },
      _filePath: { $exists: false }
    });

    if (directCount > 0) {
      console.log(`✓ Found ${directCount} categories already in direct format.`);
      console.log("   Migration may have already been completed.\n");
    } else {
      console.log("❌ No category data found at all.");
      console.log("   Categories collection is empty.\n");
    }

    await client.close();
    return;
  }

  // Step 2: Parse the JSON content
  console.log("✓ Found storage adapter document");
  
  let categories: Category[] = [];
  try {
    const parsed = JSON.parse(storageDoc.content as string);
    categories = parsed.categories || [];
    console.log(`✓ Parsed ${categories.length} categories from JSON blob\n`);
  } catch (error) {
    console.error("❌ Failed to parse categories JSON:", error);
    await client.close();
    process.exit(1);
  }

  if (categories.length === 0) {
    console.log("⚠️  No categories to migrate.");
    // Still remove the old document
    await categoriesCollection.deleteOne({ _filePath: "content/categories.json" });
    console.log("✓ Removed empty storage adapter document");
    await client.close();
    return;
  }

  // Step 3: Insert each category as individual document
  console.log("📥 Migrating categories to individual documents...");
  
  let migrated = 0;
  let skipped = 0;

  for (const category of categories) {
    // Ensure required fields
    const normalizedCategory = {
      ...category,
      slug: category.slug || category.id,
      name: category.name || category.label,
      label: category.label || category.name,
      createdAt: category.createdAt || new Date().toISOString(),
      updatedAt: category.updatedAt || new Date().toISOString(),
    };

    // Check if already exists (avoid duplicates)
    const existing = await categoriesCollection.findOne({ 
      id: normalizedCategory.id,
      _filePath: { $exists: false }
    });
    
    if (existing) {
      // Already exists as direct document
      skipped++;
      continue;
    }

    // Insert as new document
    await categoriesCollection.insertOne(normalizedCategory);
    migrated++;
    console.log(`  ✓ ${normalizedCategory.name}`);
  }

  console.log(`\n✓ Migrated ${migrated} categories`);
  if (skipped > 0) {
    console.log(`   (${skipped} already existed, skipped)`);
  }

  // Step 4: Remove the old storage adapter document
  console.log("\n🧹 Removing old storage adapter document...");
  await categoriesCollection.deleteOne({ _filePath: "content/categories.json" });
  console.log("✓ Old storage adapter document removed");

  // Step 5: Verify migration
  console.log("\n📊 Verifying migration...");
  const finalCount = await categoriesCollection.countDocuments({ 
    id: { $exists: true } 
  });
  console.log(`✓ Total categories in database: ${finalCount}`);

  // Show all categories
  const allCategories = await categoriesCollection
    .find({ id: { $exists: true } })
    .sort({ order: 1 })
    .toArray();
  
  console.log("\n📋 Categories:");
  allCategories.forEach((cat, i) => {
    console.log(`   ${i + 1}. ${cat.name} (${cat.slug}) - order: ${cat.order}`);
  });

  await client.close();
  console.log("\n✅ Migration complete!");
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

