import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getEntry } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/cms/categories";
import { PostCarousel } from "@/components/site/post-carousel";
import { Button } from "@/components/ui/button";
import type { PostEntry } from "@/lib/cms/types";

// Force dynamic rendering to avoid MongoDB connection during build
export const dynamic = 'force-dynamic';

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
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Back button - fixed 16px from top and left on all breakpoints */}
      <div className="fixed top-4 left-4 z-50">
        {/* Mobile: larger icon-only button (48px with 28px icon) */}
        <Button
          asChild
          className="sm:hidden h-12 w-12 p-0 bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-zinc-900 border-0"
        >
          <Link href="/">
            <ChevronLeft className="w-7 h-7" />
          </Link>
        </Button>
        {/* Larger breakpoints: icon + label */}
        <Button
          asChild
          className="hidden sm:inline-flex bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-zinc-900 border-0 gap-1 pl-2 pr-4"
        >
          <Link href="/">
            <ChevronLeft className="w-6 h-6" />
            Back
          </Link>
        </Button>
      </div>

      {/* Main content - 16px top margin on desktop only */}
      <div className="flex flex-col items-center gap-4 lg:pt-4">
        {/* Carousel Section - full width to edge */}
        <div className="w-full">
          <PostCarousel media={orderedMedia} initialIndex={initialCarouselIndex} />
        </div>

        {/* Post Info - centered with exact Figma spacing */}
        <div className="w-full flex flex-col items-center gap-2 px-4">
          {/* Title */}
          {post.data.title && (
            <h1 className="text-h1-bold text-black dark:text-white text-center w-full">
              {post.data.title as string}
            </h1>
          )}

          {/* Description */}
          {post.data.description && (
            <p className="text-body-editorial text-black dark:text-white text-center w-full">
              {post.data.description as string}
            </p>
          )}

          {/* Categories and Date */}
          {(postCategories.length > 0 || formattedDate) && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-body px-4">
              {/* Categories */}
              {postCategories.map((category) => (
                <span key={category!.id} className="text-zinc-500 dark:text-zinc-400">
                  {category!.label}
                </span>
              ))}
              {/* Date */}
              {formattedDate && (
                <span className="text-zinc-400 dark:text-zinc-500">{formattedDate}</span>
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
