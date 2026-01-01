"use client";

import { useState } from "react";
import Image from "next/image";
import type { MediaItem } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { GalleryLightbox } from "../../gallery-lightbox";
import { FadeInOnScroll } from "../../fade-in-on-scroll";

interface GridLayoutProps {
  mediaItems: MediaItem[];
  columns?: number;
  gap?: number;
  aspectRatio?: string;
  className?: string;
  width?: 'normal' | 'large' | 'full';
}

/**
 * Grid Gallery Layout
 * 
 * Fixed column grid with equal spacing and aspect ratios
 */
/**
 * Get the best image URL based on gallery width setting
 * - normal: default url (~1600px) is fine for contained layouts
 * - large/full: use display variant (2400px) for sharp full-viewport images
 */
function getImageUrl(item: MediaItem, width: 'normal' | 'large' | 'full'): string {
  if (width === 'large' || width === 'full') {
    // Use display (2400px) for full-width layouts, fall back to large, then default url
    return item.variants?.display?.url || item.variants?.large?.url || item.url;
  }
  // Normal width: default url is fine (already optimized ~1600px)
  return item.url;
}

export function GridLayout({ 
  mediaItems, 
  columns = 3,
  gap = 16,
  aspectRatio = "3/2",
  className,
  width = 'normal',
}: GridLayoutProps) {
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

  return (
    <>
      <div 
        className={cn("grid items-start", className)}
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {mediaItems.map((item, index) => {
          const blurDataURL = item.blurDataURL;
          const imageSrc = getImageUrl(item, width);
          
          // Dynamic sizes based on width setting
          // For large/full: images span portion of full viewport
          // For normal: contained within article
          const imageSizes = width === 'large' || width === 'full'
            ? `${100 / columns}vw`  // Portion of full viewport
            : `(max-width: 768px) ${100 / columns}vw, ${1024 / columns}px`;
          
          return (
          <FadeInOnScroll key={item.id}>
            <div
              className="w-full overflow-hidden bg-muted cursor-pointer"
              onClick={() => handleImageClick(index)}
            >
              <Image
                src={imageSrc}
                alt={item.alt || item.originalName}
                width={item.width || 1200}
                height={item.height || 800}
                className="w-full h-auto"
                sizes={imageSizes}
                quality={80}
                placeholder={blurDataURL ? "blur" : "empty"}
                blurDataURL={blurDataURL}
              />
            </div>
          </FadeInOnScroll>
          );
        })}
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

