"use client";

import Image from "next/image";
import type { PageGalleryBlock } from "@/lib/cms/page-blocks";
import { spacingScale, aspectRatios } from "@/lib/design-tokens";
import type { MediaItem } from "@/lib/cms/types";

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
  const { columns, gap, aspectRatio = 'auto' } = block.data;
  
  // Get mobile overrides if applicable
  const mobileColumns = block.mobile?.columns;
  const mobileGap = block.mobile?.gap;
  
  const effectiveColumns = isMobile && mobileColumns ? mobileColumns : columns;
  const effectiveGap = isMobile && mobileGap ? mobileGap : gap;

  if (mediaItems.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
        No images in gallery
      </div>
    );
  }

  const aspectStyle = aspectRatio !== 'auto' 
    ? { aspectRatio: aspectRatios[aspectRatio] }
    : { aspectRatio: '1 / 1' };

  return (
    <div 
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
        gap: spacingScale[effectiveGap],
      }}
    >
      {mediaItems.map((item) => (
        <div 
          key={item.id}
          className="relative overflow-hidden rounded-lg bg-muted"
          style={aspectStyle}
        >
          <Image
            src={item.variants?.thumb?.url || item.url}
            alt={item.alt || item.originalName}
            fill
            className="object-cover"
            sizes={`(max-width: 768px) ${100 / (mobileColumns || 1)}vw, ${100 / columns}vw`}
          />
        </div>
      ))}
    </div>
  );
}

