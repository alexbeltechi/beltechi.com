import { NextResponse } from "next/server";
import { listEntries } from "@/lib/db/entries";
import { loadSchemas } from "@/lib/cms/schema";

interface UsageInfo {
  collection: string;
  slug: string;
  title: string;
}

// GET /api/admin/media/[id]/usage - Get all entries using this media
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params;
    const schemas = await loadSchemas();
    const usages: UsageInfo[] = [];

    // Check each collection for media references
    for (const [collectionSlug] of schemas) {
      const { entries } = await listEntries(collectionSlug, { limit: 10000 });

      for (const entry of entries) {
        let isUsed = false;

        // Check for media field (single media)
        if (entry.data.featuredImage === mediaId) {
          isUsed = true;
        }

        // Check for media:list field (posts)
        if (Array.isArray(entry.data.media)) {
          if ((entry.data.media as string[]).includes(mediaId)) {
            isUsed = true;
          }
        }

        // Check blocks for media references (articles)
        if (Array.isArray(entry.data.content)) {
          for (const block of entry.data.content as Array<Record<string, unknown>>) {
            if (block.mediaId === mediaId) {
              isUsed = true;
            }
            if (Array.isArray(block.mediaIds)) {
              if ((block.mediaIds as string[]).includes(mediaId)) {
                isUsed = true;
              }
            }
          }
        }

        // Check SEO og image
        if (entry.data.seo && typeof entry.data.seo === "object") {
          const seo = entry.data.seo as Record<string, unknown>;
          if (seo.ogImage === mediaId) {
            isUsed = true;
          }
        }

        if (isUsed) {
          usages.push({
            collection: collectionSlug,
            slug: entry.slug,
            title: (entry.data.title as string) || entry.slug,
          });
        }
      }
    }

    return NextResponse.json({ usages });
  } catch (error) {
    console.error("Failed to get media usage:", error);
    return NextResponse.json(
      { error: "Failed to get media usage", usages: [] },
      { status: 500 }
    );
  }
}






