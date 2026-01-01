"use client";

import type { GalleryProps } from "./types";
import { ClassicLayout } from "./layouts/classic-layout";
import { GridLayout } from "./layouts/grid-layout";
import { cn } from "@/lib/utils";

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
  width = "normal",
}: GalleryProps) {
  if (!mediaItems || mediaItems.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
        No images in gallery
      </div>
    );
  }

  // Width classes for breakout layouts
  // These use viewport width and negative margins to break out of the container
  const widthClasses = {
    normal: "", // Default, stays within container
    large: "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4", // Full width with 16px margins
    full: "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen", // Full width, edge to edge
  };

  const renderLayout = () => {
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
  };

  // Wrap in width container if not normal
  if (width !== "normal") {
    return (
      <div className={cn(widthClasses[width])}>
        {renderLayout()}
      </div>
    );
  }

  return renderLayout();
}

// Export types and layouts for convenience
export type { GalleryProps, GalleryLayout, GalleryWidth } from "./types";
export { galleryLayoutMeta } from "./types";
export { ClassicLayout } from "./layouts/classic-layout";
export { GridLayout } from "./layouts/grid-layout";

