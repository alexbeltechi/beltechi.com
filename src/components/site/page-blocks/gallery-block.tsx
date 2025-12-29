"use client";

import type { PageGalleryBlock } from "@/lib/cms/page-blocks";
import type { MediaItem } from "@/lib/cms/types";
import { Gallery } from "@/components/shared/gallery";
import { spacingScale } from "@/lib/design-tokens";

interface GalleryBlockComponentProps {
  block: PageGalleryBlock;
  isMobile?: boolean;
  // For server-side rendering, pass resolved media items
  mediaItems?: MediaItem[];
}

export function GalleryBlockComponent({ 
  block, 
  isMobile,
  mediaItems = [],
}: GalleryBlockComponentProps) {
  const { layout = 'classic', columns = 3, gap, aspectRatio = 'auto' } = block.data;
  
  // Get mobile overrides if applicable
  const mobileColumns = block.mobile?.columns;
  const mobileGap = block.mobile?.gap;
  
  const effectiveColumns = isMobile && mobileColumns ? mobileColumns : columns;
  const effectiveGap = isMobile && mobileGap ? spacingScale[mobileGap] : spacingScale[gap];

  if (mediaItems.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
        No images in gallery
      </div>
    );
  }

  // Convert gap from spacing scale to pixels
  const gapInPixels = parseInt(effectiveGap.replace('px', ''));

  return (
    <Gallery
      mediaItems={mediaItems}
      layout={layout}
      columns={effectiveColumns}
      gap={gapInPixels}
      aspectRatio={aspectRatio === 'auto' ? '3/2' : aspectRatio}
      isMobile={isMobile}
    />
  );
}

