"use client";

import { Gallery } from "@/components/shared/gallery";
import { FadeInOnScroll } from "@/components/shared/fade-in-on-scroll";
import type { Block, GalleryBlock, MediaItem } from "@/lib/cms/types";

interface ArticleContentProps {
  blocks: Block[];
  mediaItems: MediaItem[];
}

/**
 * Article Content Renderer
 * 
 * Client component that renders article blocks with scroll-triggered
 * fade-in animations. Each block fades in as it enters the viewport.
 */
export function ArticleContent({ blocks, mediaItems }: ArticleContentProps) {
  // Create a map of mediaId -> MediaItem for quick lookup
  const mediaMap = new Map<string, MediaItem>();
  mediaItems.forEach((item) => mediaMap.set(item.id, item));
  return (
    <div className="w-full max-w-[1024px] px-4 pb-16 space-y-6">
      {blocks.map((block) => {
        switch (block.type) {
          case "text":
            return (
              <FadeInOnScroll key={block.id}>
                <div
                  className="prose prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
              </FadeInOnScroll>
            );

          case "gallery":
            const galleryBlock = block as GalleryBlock;
            const galleryMediaItems = galleryBlock.mediaIds
              .map((id) => mediaMap.get(id))
              .filter(Boolean) as MediaItem[];

            // Gallery already has FadeInOnScroll on each row internally
            return (
              <Gallery
                key={block.id}
                mediaItems={galleryMediaItems}
                layout={galleryBlock.layout || "classic"}
                columns={galleryBlock.columns}
                gap={galleryBlock.gap}
                width={galleryBlock.width}
              />
            );

          case "youtube":
            const videoId = extractYouTubeId(block.url);
            return (
              <FadeInOnScroll key={block.id}>
                <div className="space-y-2">
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
              </FadeInOnScroll>
            );

          case "quote":
            return (
              <FadeInOnScroll key={block.id}>
                <blockquote className="border-l-4 border-primary pl-6 py-2 italic text-lg">
                  <p className="mb-2">{block.text}</p>
                  {block.attribution && (
                    <footer className="text-sm text-muted-foreground not-italic">
                      — {block.attribution}
                    </footer>
                  )}
                </blockquote>
              </FadeInOnScroll>
            );

          case "divider":
            return (
              <FadeInOnScroll key={block.id}>
                <hr className="border-border my-8" />
              </FadeInOnScroll>
            );

          default:
            return null;
        }
      })}
    </div>
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

