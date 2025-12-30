/**
 * Migration Script: Generate Blur Placeholders for Existing Images
 * 
 * This script:
 * 1. Fetches all existing media items from MongoDB
 * 2. For each image without blurDataURL:
 *    - Downloads the image from Blob
 *    - Generates a tiny blur placeholder
 *    - Updates MongoDB with the blurDataURL
 * 
 * Run with: npx tsx scripts/generate-blur-placeholders.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

import { generateBlurPlaceholder } from "../src/lib/cms/image-processing";
import * as mediaDb from "../src/lib/db/media";

async function generateBlurPlaceholders() {
  console.log("🔍 Fetching all media items...\n");

  // Fetch all media items
  const { items: allMedia, total } = await mediaDb.listMedia({
    limit: 1000, // Adjust if you have more
    offset: 0,
  });

  console.log(`Found ${total} total media items\n`);

  // Filter to only processable images without blurDataURL
  const imagesToProcess = allMedia.filter((item) => {
    const isImage = item.mime.startsWith("image/");
    const needsBlur = !item.blurDataURL;
    return isImage && needsBlur;
  });

  if (imagesToProcess.length === 0) {
    console.log("✅ All images already have blur placeholders!");
    return;
  }

  console.log(`📸 Processing ${imagesToProcess.length} images...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < imagesToProcess.length; i++) {
    const item = imagesToProcess[i];
    const progress = `[${i + 1}/${imagesToProcess.length}]`;

    try {
      console.log(`${progress} Processing: ${item.filename}`);

      // Fetch image from URL (works for both Blob and local)
      const response = await fetch(item.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate blur placeholder
      const blurDataURL = await generateBlurPlaceholder(buffer);

      // Update MongoDB
      await mediaDb.updateMedia(item.id, { blurDataURL });

      successCount++;
      console.log(`  ✓ Generated blur placeholder (${blurDataURL.length} bytes)\n`);
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Migration Complete!");
  console.log("=".repeat(50));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📈 Total: ${imagesToProcess.length}`);
}

// Run the migration
generateBlurPlaceholders()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });

