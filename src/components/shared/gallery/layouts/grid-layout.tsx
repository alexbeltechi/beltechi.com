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
}

/**
 * Grid Gallery Layout
 * 
 * Fixed column grid with equal spacing and aspect ratios
 */
export function GridLayout({ 
  mediaItems, 
  columns = 3,
  gap = 16,
  aspectRatio = "3/2",
  className 
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
          return (
          <FadeInOnScroll key={item.id}>
            <div
              className="w-full overflow-hidden bg-muted cursor-pointer"
              onClick={() => handleImageClick(index)}
            >
              <Image
                src={item.url}
                alt={item.alt || item.originalName}
                width={item.width || 1200}
                height={item.height || 800}
                className="w-full h-auto"
                sizes={`(max-width: 768px) ${100 / columns}vw, ${100 / columns}vw`}
                quality={70}
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

