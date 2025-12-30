"use client";

import { useState } from "react";
import Image from "next/image";
import type { MediaItem } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { GalleryLightbox } from "../../gallery-lightbox";
import { FadeInOnScroll } from "../../fade-in-on-scroll";

interface ClassicLayoutProps {
  mediaItems: MediaItem[];
  gap?: number;
  className?: string;
}

/**
 * Classic Gallery Layout
 * 
 * Smart auto-layout rules:
 * - 1 image: Full width
 * - 2 images: Each image full width (stacked)
 * - 3+ images: Alternating pattern - 1 full width, then 2 side-by-side, repeat
 */
export function ClassicLayout({ 
  mediaItems, 
  gap = 16,
  className 
}: ClassicLayoutProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (mediaItems.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
        No images in gallery
      </div>
    );
  }

  const count = mediaItems.length;

  // Single image: full width
  if (count === 1) {
    return (
      <>
        <FadeInOnScroll className={cn("w-full", className)}>
          <GalleryImage item={mediaItems[0]} index={0} onClick={handleImageClick} isFullWidth />
        </FadeInOnScroll>
        <GalleryLightbox
          mediaItems={mediaItems}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </>
    );
  }

  // Two images: each full width (stacked)
  if (count === 2) {
    return (
      <>
        <div 
          className={cn("flex flex-col", className)}
          style={{ gap: `${gap}px` }}
        >
          <FadeInOnScroll>
            <GalleryImage item={mediaItems[0]} index={0} onClick={handleImageClick} isFullWidth />
          </FadeInOnScroll>
          <FadeInOnScroll delay={100}>
            <GalleryImage item={mediaItems[1]} index={1} onClick={handleImageClick} isFullWidth />
          </FadeInOnScroll>
        </div>
        <GalleryLightbox
          mediaItems={mediaItems}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </>
    );
  }

  // 3+ images: Alternating pattern (1 full width, then 2 side-by-side, repeat)
  const rows: MediaItem[][] = [];
  let i = 0;
  
  while (i < count) {
    const remaining = count - i;
    
    if (remaining === 1) {
      // Last single image: full width
      rows.push([mediaItems[i]]);
      i++;
    } else if (remaining === 2) {
      // Last two images: both full width (stacked)
      rows.push([mediaItems[i]]);
      rows.push([mediaItems[i + 1]]);
      i += 2;
    } else {
      // 3 or more: 1 full width, then 2 side-by-side
      rows.push([mediaItems[i]]);
      if (i + 2 < count) {
        rows.push([mediaItems[i + 1], mediaItems[i + 2]]);
        i += 3;
      } else {
        // Only 2 remaining
        rows.push([mediaItems[i + 1]]);
        rows.push([mediaItems[i + 2]]);
        i += 3;
      }
    }
  }

  return (
    <>
      <div className={cn("flex flex-col", className)} style={{ gap: `${gap}px` }}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn(
              "grid items-start",
              row.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}
            style={{ gap: `${gap}px` }}
          >
            {row.map((item) => {
              const itemIndex = mediaItems.findIndex((m) => m.id === item.id);
              return (
                <FadeInOnScroll key={item.id}>
                  <GalleryImage 
                    item={item} 
                    index={itemIndex}
                    onClick={handleImageClick}
                    isFullWidth={row.length === 1}
                  />
                </FadeInOnScroll>
              );
            })}
          </div>
        ))}
      </div>
      <GalleryLightbox
        mediaItems={mediaItems}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

/**
 * Gallery image component with original aspect ratio preserved
 */
function GalleryImage({ 
  item, 
  index,
  onClick,
  isFullWidth = false,
}: { 
  item: MediaItem;
  index: number;
  onClick: (index: number) => void;
  isFullWidth?: boolean;
}) {
  // Use blur placeholder for instant loading
  const blurDataURL = item.blurDataURL;

  // Dynamic sizes based on layout position
  // Full-width images need higher resolution (~1024px container)
  // Double-column images are fine at ~512px
  const imageSizes = isFullWidth
    ? "(max-width: 768px) 100vw, 1024px"
    : "(max-width: 768px) 100vw, 512px";

  return (
    <div 
      className="w-full overflow-hidden bg-muted cursor-pointer"
      onClick={() => onClick(index)}
    >
      <Image
        src={item.url}
        alt={item.alt || item.originalName}
        width={item.width || 1200}
        height={item.height || 800}
        className="w-full h-auto"
        sizes={imageSizes}
        quality={70}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
      />
    </div>
  );
}

