/**
 * Migration Script: File-based content → MongoDB
 * 
 * Run this once to migrate existing content from JSON files to MongoDB
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs/promises";
import path from "path";
import { getDb, Collections } from "../src/lib/db/mongodb";

const CONTENT_DIR = path.join(process.cwd(), "content");

interface Entry {
  id: string;
  collection: string;
  slug: string;
  status: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface MediaItem {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  variants?: Record<string, unknown>;
  createdAt: string;
  uploadedBy?: string;
}

interface Category {
  id: string;
  label: string;
  slug: string;
  order: number;
  showOnHomepage?: boolean;
}

async function migrateEntries() {
  console.log("📦 Migrating entries...");
  
  const db = await getDb();
  const collection = db.collection(Collections.ENTRIES);
  
  const entriesDir = path.join(CONTENT_DIR, "entries");
  const collections = await fs.readdir(entriesDir);
  
  let count = 0;
  
  for (const collectionName of collections) {
    const collectionDir = path.join(entriesDir, collectionName);
    const stat = await fs.stat(collectionDir);
    
    if (!stat.isDirectory()) continue;
    
    const files = await fs.readdir(collectionDir);
    
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      
      const filePath = path.join(collectionDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      const entry: Entry = JSON.parse(content);
      
      // Add collection field if missing
      if (!entry.collection) {
        entry.collection = collectionName;
      }
      
      // Insert into MongoDB (upsert to avoid duplicates)
      await collection.updateOne(
        { collection: entry.collection, slug: entry.slug },
        { $set: entry },
        { upsert: true }
      );
      
      count++;
      console.log(`  ✓ ${collectionName}/${entry.slug}`);
    }
  }
  
  console.log(`✓ Migrated ${count} entries\n`);
}

async function migrateMedia() {
  console.log("🖼️  Migrating media...");
  
  const db = await getDb();
  const collection = db.collection(Collections.MEDIA);
  
  const mediaIndexPath = path.join(CONTENT_DIR, "media", "index.json");
  
  try {
    const content = await fs.readFile(mediaIndexPath, "utf-8");
    const mediaIndex = JSON.parse(content) as { items: MediaItem[] };
    
    for (const media of mediaIndex.items) {
      // Insert into MongoDB (upsert to avoid duplicates)
      await collection.updateOne(
        { id: media.id },
        { $set: media },
        { upsert: true }
      );
      
      console.log(`  ✓ ${media.filename}`);
    }
    
    console.log(`✓ Migrated ${mediaIndex.items.length} media items\n`);
  } catch (error) {
    console.log(`  ℹ️  No media index found (${error})\n`);
  }
}

async function migrateCategories() {
  console.log("🏷️  Migrating categories...");
  
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);
  
  const categoriesPath = path.join(CONTENT_DIR, "categories.json");
  
  try {
    const content = await fs.readFile(categoriesPath, "utf-8");
    const categoriesData = JSON.parse(content) as { categories: Category[] };
    
    for (const category of categoriesData.categories) {
      // Insert into MongoDB (upsert to avoid duplicates)
      await collection.updateOne(
        { id: category.id },
        { $set: category },
        { upsert: true }
      );
      
      console.log(`  ✓ ${category.label}`);
    }
    
    console.log(`✓ Migrated ${categoriesData.categories.length} categories\n`);
  } catch (error) {
    console.log(`  ℹ️  No categories found (${error})\n`);
  }
}

async function main() {
  console.log("\n🚀 Starting migration to MongoDB...\n");
  
  try {
    await migrateEntries();
    await migrateMedia();
    await migrateCategories();
    
    console.log("✅ Migration complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();

