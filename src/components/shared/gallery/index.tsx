"use client";

import type { GalleryProps } from "./types";
import { ClassicLayout } from "./layouts/classic-layout";
import { GridLayout } from "./layouts/grid-layout";

/**
 * Universal Gallery Component
 * 
 * A flexible gallery that works across the CMS:
 * - Articles & Posts (content blocks)
 * - Custom Pages (page builder)
 * - Any other content type
 * 
 * Supports multiple layout presets inspired by WordPress galleries.
 */
export function Gallery({
  mediaItems,
  layout = "classic",
  gap = 16,
  columns = 3,
  aspectRatio = "3/2",
  className,
  isMobile = false,
}: GalleryProps) {
  if (!mediaItems || mediaItems.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
        No images in gallery
      </div>
    );
  }

  switch (layout) {
    case "classic":
      return (
        <ClassicLayout
          mediaItems={mediaItems}
          gap={gap}
          className={className}
        />
      );

    case "grid":
      return (
        <GridLayout
          mediaItems={mediaItems}
          columns={columns}
          gap={gap}
          aspectRatio={aspectRatio}
          className={className}
        />
      );

    case "masonry":
      // TODO: Implement masonry layout
      return (
        <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
          Masonry layout coming soon
        </div>
      );

    case "carousel":
      // TODO: Implement carousel layout
      return (
        <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
          Carousel layout coming soon
        </div>
      );

    default:
      return (
        <ClassicLayout
          mediaItems={mediaItems}
          gap={gap}
          className={className}
        />
      );
  }
}

// Export types and layouts for convenience
export type { GalleryProps, GalleryLayout } from "./types";
export { galleryLayoutMeta } from "./types";
export { ClassicLayout } from "./layouts/classic-layout";
export { GridLayout } from "./layouts/grid-layout";

