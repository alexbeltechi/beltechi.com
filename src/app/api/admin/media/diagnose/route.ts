import { NextResponse } from "next/server";
import { getDb, Collections } from "@/lib/db/mongodb";

/**
 * GET /api/admin/media/diagnose
 * 
 * Diagnoses orphaned media - media IDs referenced by posts but missing from media collection
 */
export async function GET() {
  try {
    const db = await getDb();
    const entriesCollection = db.collection(Collections.ENTRIES);
    const mediaCollection = db.collection(Collections.MEDIA);

    // Get all posts
    const posts = await entriesCollection
      .find({ collection: "posts" })
      .toArray();

    // Collect all referenced media IDs
    const allMediaIds = new Set<string>();
    const postDetails: Array<{
      slug: string;
      title: string;
      mediaIds: string[];
      coverMediaId?: string;
    }> = [];

    for (const post of posts) {
      const mediaIds: string[] = [];

      if (post.data?.media && Array.isArray(post.data.media)) {
        post.data.media.forEach((id: string) => {
          allMediaIds.add(id);
          mediaIds.push(id);
        });
      }

      if (post.data?.coverMediaId) {
        allMediaIds.add(post.data.coverMediaId);
      }

      if (mediaIds.length > 0 || post.data?.coverMediaId) {
        postDetails.push({
          slug: post.slug,
          title: post.data?.title || post.slug,
          mediaIds,
          coverMediaId: post.data?.coverMediaId,
        });
      }
    }

    // Check which media IDs exist in the media collection
    const existingMedia = await mediaCollection
      .find({ id: { $in: Array.from(allMediaIds) } })
      .project({ id: 1, filename: 1, url: 1 })
      .toArray();

    const existingMediaIds = new Set(existingMedia.map((m) => m.id as string));
    const existingMediaMap = new Map(
      existingMedia.map((m) => [m.id, { filename: m.filename, url: m.url }])
    );

    // Find orphaned media IDs
    const orphanedMediaIds = Array.from(allMediaIds).filter(
      (id) => !existingMediaIds.has(id)
    );

    // Find posts with orphaned media
    const postsWithOrphans = postDetails
      .map((post) => {
        const orphaned = post.mediaIds.filter((id) =>
          orphanedMediaIds.includes(id)
        );
        const coverOrphaned =
          post.coverMediaId && orphanedMediaIds.includes(post.coverMediaId);

        if (orphaned.length > 0 || coverOrphaned) {
          return {
            slug: post.slug,
            title: post.title,
            orphanedMediaIds: orphaned,
            coverMediaOrphaned: coverOrphaned,
          };
        }
        return null;
      })
      .filter(Boolean);

    // Count total media in database
    const totalMediaInDb = await mediaCollection.countDocuments({
      id: { $exists: true },
    });

    return NextResponse.json({
      summary: {
        totalPosts: posts.length,
        postsWithMedia: postDetails.length,
        totalUniqueMediaReferenced: allMediaIds.size,
        mediaDocumentsInDb: totalMediaInDb,
        mediaDocumentsMatched: existingMediaIds.size,
        orphanedMediaCount: orphanedMediaIds.length,
      },
      orphanedMediaIds,
      postsWithOrphans,
      // Sample of existing media for debugging
      sampleExistingMedia: existingMedia.slice(0, 5).map((m) => ({
        id: m.id,
        filename: m.filename,
        url: m.url,
      })),
    });
  } catch (error) {
    console.error("Diagnose error:", error);
    return NextResponse.json(
      { error: "Failed to diagnose media" },
      { status: 500 }
    );
  }
}

