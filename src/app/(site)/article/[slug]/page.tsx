import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getEntry, getPublishedEntries } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/db/media";
import { listCategories } from "@/lib/db/categories";
import { Button } from "@/components/ui/button";
import { ArticleContent } from "@/components/site/article-content";
import { PostGrid } from "@/components/site/post-grid";
import type { Entry, GalleryBlock, Block, MediaItem } from "@/lib/cms/types";

// Use ISR - regenerate every 60 seconds for instant navigation
export const revalidate = 60;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  const rawArticle = await getEntry("articles", slug);

  if (!rawArticle || rawArticle.status !== "published") {
    notFound();
  }

  const article = rawArticle as Entry;

  // Get categories
  const categoryIds = (article.data.categories as string[]) || [];
  const allCategories = await listCategories();
  const articleCategories = categoryIds
    .map((id) => allCategories.find((c) => c.id === id))
    .filter(Boolean);

  // Format date
  const articleDate = article.data.date as string | undefined;
  const formattedDate: string | null = articleDate
    ? new Date(articleDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Get content blocks
  const blocks = (article.data.content as Block[]) || [];

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Spacer to position back button 16px below header */}
      <div className="h-4" aria-hidden="true" />
      
      {/* Back button container - sticky at top 16px, initially 16px below header */}
      <div className="sticky top-4 z-40 h-0">
        <div className="absolute left-4 top-0">
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
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center">
        {/* Article Header - centered with padding */}
        <div className="w-full max-w-4xl px-8 pt-[80px] lg:pt-[120px] pb-[120px]">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground text-center">
              {articleCategories.map((category) => (
                <Link
                  key={category!.id}
                  href={`/${category!.slug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {category!.label}
                </Link>
              ))}
              {formattedDate ? <span>{formattedDate}</span> : null}
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-center">
              {String(article.data.title)}
            </h1>

            {article.data.excerpt ? (
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {String(article.data.excerpt)}
              </p>
            ) : null}
          </div>
        </div>

        {/* Article Content Blocks - Suspended for streaming */}
        <Suspense fallback={<div className="w-full max-w-[1024px] h-[400px]" />}>
          <ArticleContentAsync blocks={blocks} />
        </Suspense>
      </div>

      {/* More to explore section - Suspended for streaming */}
      <Suspense fallback={<div className="h-[400px]" />}>
        <MoreToExploreAsync articleId={article.id} categoryIds={categoryIds} />
      </Suspense>
    </main>
  );
}

// Async component for article content with media fetching
async function ArticleContentAsync({ blocks }: { blocks: Block[] }) {
  // Collect all media IDs from gallery blocks
  const galleryBlocks = blocks.filter((b) => b.type === "gallery") as GalleryBlock[];
  const allMediaIds = galleryBlocks.flatMap((b) => b.mediaIds);
  const mediaItems = allMediaIds.length > 0 ? await getMediaByIds(allMediaIds) : [];

  return <ArticleContent blocks={blocks} mediaItems={mediaItems} />;
}

// Async component for related posts
async function MoreToExploreAsync({ 
  articleId,
  categoryIds 
}: { 
  articleId: string;
  categoryIds: string[];
}) {
  const MAX_RELATED_POSTS = 12;
  
  // Get all published posts
  const allPosts = await getPublishedEntries("posts");

  // Separate posts into related (same category) and others
  const relatedPosts = allPosts.filter((p) => {
    const pCategories = (p.data.categories as string[]) || [];
    return pCategories.some((catId) => categoryIds.includes(catId));
  });

  const unrelatedPosts = allPosts.filter((p) => {
    const pCategories = (p.data.categories as string[]) || [];
    return !pCategories.some((catId) => categoryIds.includes(catId));
  });

  // Shuffle unrelated posts for randomness
  const shuffledUnrelated = unrelatedPosts.sort(() => Math.random() - 0.5);

  // Combine: related first, then random others, up to MAX_RELATED_POSTS
  const displayPosts = [...relatedPosts, ...shuffledUnrelated].slice(0, MAX_RELATED_POSTS);

  if (displayPosts.length === 0) {
    return null;
  }

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

  // Get categories
  const allCategories = await listCategories();
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
    <div className="mt-16 lg:mt-24 pb-10">
      <h2 className="text-[15px] font-normal font-[family-name:var(--font-syne)] text-zinc-500 px-4 mb-4 text-center">
        More to explore
      </h2>
      <PostGrid 
        posts={displayPosts} 
        mediaMap={relatedMediaMap} 
        categories={relatedCategories} 
      />
    </div>
  );
}

