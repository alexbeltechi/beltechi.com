import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEntry } from "@/lib/cms/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/cms/categories";
import { PostCarousel } from "@/components/site/post-carousel";
import type { PostEntry } from "@/lib/cms/types";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  const rawPost = await getEntry("posts", slug);

  if (!rawPost || rawPost.status !== "published") {
    notFound();
  }
  
  // Type assertion for PostEntry
  const post = rawPost as PostEntry;

  // Get media for this post
  const mediaIds = (post.data.media as string[]) || [];
  const mediaItems = await getMediaByIds(mediaIds);

  // Maintain order
  const orderedMedia = mediaIds
    .map((id) => mediaItems.find((m) => m.id === id))
    .filter(Boolean);

  // Find cover index (defaults to 0)
  const coverMediaId = post.data.coverMediaId as string | undefined;
  const coverIndex = coverMediaId ? mediaIds.indexOf(coverMediaId) : 0;
  const initialCarouselIndex = coverIndex >= 0 ? coverIndex : 0;

  // Get category labels
  const categoryIds = (post.data.categories as string[]) || [];
  const allCategories = await listCategories();
  const postCategories = categoryIds
    .map((id) => allCategories.find((c) => c.id === id))
    .filter(Boolean);

  // Format date
  const postDate = post.data.date as string | undefined;
  const formattedDate = postDate
    ? new Date(postDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <main className="min-h-screen bg-white">
      {/* Back button - fixed position */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-0.5 px-3 py-2 bg-white rounded-full text-body text-black hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
      </div>

      {/* Main content with top padding */}
      <div className="pt-14 flex flex-col items-center gap-4">
        {/* Carousel Section */}
        <div className="w-full flex flex-col items-center gap-4">
          <PostCarousel media={orderedMedia} initialIndex={initialCarouselIndex} />
        </div>

        {/* Post Info - centered with exact Figma spacing */}
        <div className="w-full flex flex-col items-center gap-2 px-4">
          {/* Title */}
          {post.data.title && (
            <h1 className="text-h1-bold text-black text-center w-full">
              {post.data.title as string}
            </h1>
          )}

          {/* Description */}
          {post.data.description && (
            <p className="text-body-editorial text-black text-center w-full">
              {post.data.description as string}
            </p>
          )}

          {/* Categories and Date */}
          {(postCategories.length > 0 || formattedDate) && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-body px-4">
              {/* Categories - dark grey #595959 */}
              {postCategories.map((category) => (
                <span key={category!.id} style={{ color: "#595959" }}>
                  {category!.label}
                </span>
              ))}
              {/* Date - mid grey #999 */}
              {formattedDate && (
                <span style={{ color: "#999999" }}>{formattedDate}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* More to explore section placeholder */}
      <div className="mt-16 pb-10">
        {/* TODO: Add masonry grid of related posts */}
      </div>
    </main>
  );
}
