import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getEntry, getPublishedEntries } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/db/categories";
import { PostCarousel } from "@/components/site/post-carousel";
import { PostGrid } from "@/components/site/post-grid";
import { Button } from "@/components/ui/button";
import { PostPageWrapper } from "@/components/site/post-page-wrapper";
import type { PostEntry, MediaItem } from "@/lib/cms/types";

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

  // --- Related Posts Logic ---
  const MAX_RELATED_POSTS = 12;
  
  // Get all published posts except current one
  const allPosts = await getPublishedEntries("posts");
  const otherPosts = allPosts.filter((p) => p.id !== post.id);

  // Separate posts into related (same category) and others
  const relatedPosts = otherPosts.filter((p) => {
    const pCategories = (p.data.categories as string[]) || [];
    return pCategories.some((catId) => categoryIds.includes(catId));
  });

  const unrelatedPosts = otherPosts.filter((p) => {
    const pCategories = (p.data.categories as string[]) || [];
    return !pCategories.some((catId) => categoryIds.includes(catId));
  });

  // Shuffle unrelated posts for randomness
  const shuffledUnrelated = unrelatedPosts.sort(() => Math.random() - 0.5);

  // Combine: related first, then random others, up to MAX_RELATED_POSTS
  const displayPosts = [...relatedPosts, ...shuffledUnrelated].slice(0, MAX_RELATED_POSTS);

  // Get all media for related posts
  const relatedMediaIds = new Set<string>();
  displayPosts.forEach((p) => {
    const pMediaIds = (p.data.media as string[]) || [];
    pMediaIds.forEach((id) => relatedMediaIds.add(id));
  });

  const relatedMediaItems = await getMediaByIds(Array.from(relatedMediaIds));
  const relatedMediaMap = new Map<string, MediaItem>(
    relatedMediaItems.map((item) => [item.id, item])
  );

  // Get unique category IDs from all posts for category labels
  const relatedCategoryIds = new Set(
    displayPosts.flatMap((p) => {
      const cats = p.data.categories as string[] | undefined;
      return cats || [];
    })
  );

  const relatedCategories = allCategories
    .filter((cat) => relatedCategoryIds.has(cat.id))
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  return (
    <PostPageWrapper>
      <main className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Back button - fixed 16px from top and left on all breakpoints */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          asChild
          variant="secondary"
          size="icon-lg"
        >
          <Link href="/">
            <ChevronLeft />
          </Link>
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center">
        {/* Carousel Section - full width to edge */}
        <div className="w-full">
          <PostCarousel media={orderedMedia} initialIndex={initialCarouselIndex} />
        </div>

        {/* Post Info - centered with exact Figma spacing */}
        <div className="w-full flex flex-col items-center gap-2 px-4 py-4">
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

      {/* More to explore section */}
      {displayPosts.length > 0 && (
        <div className="mt-4 lg:mt-16 pb-10">
          <h2 className="text-[15px] font-normal font-[family-name:var(--font-syne)] text-zinc-500 px-4 mb-4 text-center">
            More to explore
          </h2>
          <PostGrid 
            posts={displayPosts} 
            mediaMap={relatedMediaMap} 
            categories={relatedCategories} 
          />
        </div>
      )}
    </main>
    </PostPageWrapper>
  );
}
