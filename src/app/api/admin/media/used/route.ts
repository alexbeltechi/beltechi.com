import { NextResponse } from "next/server";
import { listEntries } from "@/lib/cms/entries";
import { loadSchemas } from "@/lib/cms/schema";

// GET /api/admin/media/used - Get all media IDs that are in use
export async function GET() {
  try {
    const schemas = await loadSchemas();
    const usedMediaIds = new Set<string>();

    // Check each collection for media references
    for (const [collectionSlug] of schemas) {
      const { entries } = await listEntries(collectionSlug, { limit: 10000 });

      for (const entry of entries) {
        // Check for media field (single media)
        if (entry.data.featuredImage) {
          usedMediaIds.add(entry.data.featuredImage as string);
        }

        // Check for media:list field (posts)
        if (Array.isArray(entry.data.media)) {
          (entry.data.media as string[]).forEach((id) => usedMediaIds.add(id));
        }

        // Check blocks for media references (articles)
        if (Array.isArray(entry.data.content)) {
          for (const block of entry.data.content as Array<Record<string, unknown>>) {
            if (block.mediaId) {
              usedMediaIds.add(block.mediaId as string);
            }
            if (Array.isArray(block.mediaIds)) {
              (block.mediaIds as string[]).forEach((id) => usedMediaIds.add(id));
            }
          }
        }

        // Check SEO og image
        if (entry.data.seo && typeof entry.data.seo === "object") {
          const seo = entry.data.seo as Record<string, unknown>;
          if (seo.ogImage) {
            usedMediaIds.add(seo.ogImage as string);
          }
        }
      }
    }

    return NextResponse.json({
      usedMediaIds: Array.from(usedMediaIds),
    });
  } catch (error) {
    console.error("Failed to get used media:", error);
    return NextResponse.json(
      { error: "Failed to get used media", usedMediaIds: [] },
      { status: 500 }
    );
  }
}






