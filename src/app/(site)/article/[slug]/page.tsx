import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, X } from "lucide-react";
import { getEntry } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/db/media";
import { listCategories, type Category } from "@/lib/db/categories";
import { Button } from "@/components/ui/button";
import { Gallery } from "@/components/shared/gallery";
import type { Entry, GalleryBlock, Block, MediaItem } from "@/lib/cms/types";

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

  // Collect all media IDs from gallery blocks
  const galleryBlocks = blocks.filter((b) => b.type === "gallery") as GalleryBlock[];
  const allMediaIds = galleryBlocks.flatMap((b) => b.mediaIds);
  const mediaItems = allMediaIds.length > 0 ? await getMediaByIds(allMediaIds) : [];

  // Create a map of mediaId -> MediaItem for quick lookup
  const mediaMap = new Map<string, MediaItem>();
  mediaItems.forEach((item) => mediaMap.set(item.id, item));

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Back button - fixed position */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          asChild
          variant="secondary"
          size="icon-lg"
          className="lg:hidden"
        >
          <Link href="/">
            <ChevronLeft />
          </Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          size="icon-lg"
          className="hidden lg:inline-flex"
        >
          <Link href="/">
            <X />
          </Link>
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center">
        {/* Article Header - centered with padding */}
        <div className="w-full max-w-4xl px-4 pt-20 pb-8">
          <div className="flex flex-col items-center text-center gap-6">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
              {String(article.data.title)}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
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

            {article.data.excerpt ? (
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {String(article.data.excerpt)}
              </p>
            ) : null}
          </div>
        </div>

        {/* Article Content Blocks */}
        <div className="w-full max-w-4xl px-4 pb-16 space-y-6">
          {blocks.map((block) => {
            switch (block.type) {
              case "text":
                return (
                  <div
                    key={block.id}
                    className="prose prose-lg dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: block.html }}
                  />
                );

              case "gallery":
                const galleryBlock = block as GalleryBlock;
                const galleryMediaItems = galleryBlock.mediaIds
                  .map((id) => mediaMap.get(id))
                  .filter(Boolean) as MediaItem[];

                return (
                  <Gallery
                    key={block.id}
                    mediaItems={galleryMediaItems}
                    layout={galleryBlock.layout || "classic"}
                    columns={galleryBlock.columns}
                    gap={galleryBlock.gap}
                  />
                );

              case "youtube":
                const videoId = extractYouTubeId(block.url);
                return (
                  <div key={block.id} className="space-y-2">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                      {videoId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
                          Invalid YouTube URL
                        </div>
                      )}
                    </div>
                    {block.caption && (
                      <p className="text-sm text-muted-foreground text-center">
                        {block.caption}
                      </p>
                    )}
                  </div>
                );

              case "quote":
                return (
                  <blockquote
                    key={block.id}
                    className="border-l-4 border-primary pl-6 py-2 italic text-lg"
                  >
                    <p className="mb-2">{block.text}</p>
                    {block.attribution && (
                      <footer className="text-sm text-muted-foreground not-italic">
                        — {block.attribution}
                      </footer>
                    )}
                  </blockquote>
                );

              case "divider":
                return (
                  <hr
                    key={block.id}
                    className="border-border my-8"
                  />
                );

              default:
                return null;
            }
          })}
        </div>
      </div>
    </main>
  );
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

