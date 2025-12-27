/**
 * Migration Script: v1.x → v2.0
 * 
 * This script migrates existing content to the new schema format.
 * 
 * Changes:
 * - Entries: Add visibility, seo, metadata fields; convert tags string to array
 * - Categories: Add slug, name, seo, timestamps, hierarchical support
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-v2.ts
 * 
 * Or with ts-node:
 *   npx ts-node scripts/migrate-to-v2.ts
 */

import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content");
const ENTRIES_DIR = path.join(CONTENT_DIR, "entries");
const CATEGORIES_PATH = path.join(CONTENT_DIR, "categories.json");

interface MigrationResult {
  file: string;
  status: "migrated" | "skipped" | "error";
  message?: string;
}

const results: MigrationResult[] = [];

/**
 * Migrate a single entry file
 */
function migrateEntry(filePath: string): MigrationResult {
  const relativePath = path.relative(CONTENT_DIR, filePath);

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const entry = JSON.parse(content);

    // Check if already migrated
    if (entry.visibility && entry.seo !== undefined) {
      return { file: relativePath, status: "skipped", message: "Already migrated" };
    }

    const now = new Date().toISOString();

    // Migrate entry
    const migrated = {
      ...entry,
      // Add new fields with defaults
      visibility: entry.visibility || "public",
      seo: entry.seo || entry.data?.seo || {},
      metadata: entry.metadata || {},
      contributors: entry.contributors || [],
      scheduledAt: entry.scheduledAt || null,
      // Ensure timestamps
      updatedAt: entry.updatedAt || entry.createdAt || now,
    };

    // Migrate data fields
    if (migrated.data) {
      // Convert tags from string to array
      if (typeof migrated.data.tags === "string") {
        migrated.data.tags = migrated.data.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);
      } else if (!migrated.data.tags) {
        migrated.data.tags = [];
      }

      // Ensure categories is array
      if (!migrated.data.categories) {
        migrated.data.categories = [];
      }

      // Remove seo from data if it was moved to top level
      if (migrated.data.seo && Object.keys(entry.seo || {}).length === 0) {
        migrated.seo = migrated.data.seo;
        delete migrated.data.seo;
      }
    }

    // Write migrated content
    fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2));

    return { file: relativePath, status: "migrated" };
  } catch (error) {
    return {
      file: relativePath,
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Migrate all entries in a collection directory
 */
function migrateCollection(collectionDir: string): void {
  if (!fs.existsSync(collectionDir)) {
    console.log(`  Directory not found: ${collectionDir}`);
    return;
  }

  const files = fs.readdirSync(collectionDir);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  for (const file of jsonFiles) {
    const result = migrateEntry(path.join(collectionDir, file));
    results.push(result);
  }
}

/**
 * Migrate categories
 */
function migrateCategories(): void {
  if (!fs.existsSync(CATEGORIES_PATH)) {
    console.log("  Categories file not found, skipping...");
    return;
  }

  try {
    const content = fs.readFileSync(CATEGORIES_PATH, "utf-8");
    const data = JSON.parse(content);
    const now = new Date().toISOString();

    let migrated = false;

    // Migrate each category
    data.categories = data.categories.map((cat: Record<string, unknown>, index: number) => {
      // Check if already migrated
      if (cat.slug && cat.createdAt) {
        return cat;
      }

      migrated = true;

      return {
        ...cat,
        // Add slug from id or label
        slug: cat.slug || cat.id,
        // Add name from label (keep both for compatibility)
        name: cat.name || cat.label,
        label: cat.label || cat.name,
        // Add order
        order: cat.order ?? index,
        // Add timestamps
        createdAt: cat.createdAt || now,
        updatedAt: cat.updatedAt || now,
        // Add empty seo
        seo: cat.seo || {},
      };
    });

    if (migrated) {
      fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(data, null, 2));
      results.push({
        file: "categories.json",
        status: "migrated",
      });
    } else {
      results.push({
        file: "categories.json",
        status: "skipped",
        message: "Already migrated",
      });
    }
  } catch (error) {
    results.push({
      file: "categories.json",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Main migration function
 */
function main() {
  console.log("\n🚀 Beltechi CMS Migration: v1.x → v2.0\n");
  console.log("=".repeat(50));

  // Migrate entries
  console.log("\n📝 Migrating entries...\n");

  const collections = ["posts", "articles"];
  for (const collection of collections) {
    console.log(`  Collection: ${collection}`);
    migrateCollection(path.join(ENTRIES_DIR, collection));
  }

  // Migrate categories
  console.log("\n📁 Migrating categories...\n");
  migrateCategories();

  // Print results
  console.log("\n" + "=".repeat(50));
  console.log("\n📊 Migration Results:\n");

  const migrated = results.filter((r) => r.status === "migrated");
  const skipped = results.filter((r) => r.status === "skipped");
  const errors = results.filter((r) => r.status === "error");

  console.log(`  ✅ Migrated: ${migrated.length}`);
  console.log(`  ⏭️  Skipped:  ${skipped.length}`);
  console.log(`  ❌ Errors:   ${errors.length}`);

  if (migrated.length > 0) {
    console.log("\n  Migrated files:");
    migrated.forEach((r) => console.log(`    - ${r.file}`));
  }

  if (errors.length > 0) {
    console.log("\n  ⚠️  Errors:");
    errors.forEach((r) => console.log(`    - ${r.file}: ${r.message}`));
  }

  console.log("\n" + "=".repeat(50));
  console.log("\n✨ Migration complete!\n");

  // Exit with error code if there were errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

// Run migration
main();



