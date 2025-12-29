"use client";

import Image from "next/image";
import type { MediaItem } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

interface ClassicLayoutProps {
  mediaItems: MediaItem[];
  gap?: number;
  className?: string;
}

/**
 * Classic Gallery Layout (WordPress-inspired)
 * 
 * Smart auto-layout rules:
 * - 1 image: Full width
 * - 2 images: Side-by-side (50/50)
 * - 3 images: First row 50/50, second row full width
 * - 4 images: 2x2 grid
 * - 5+ images: Repeat pattern, last odd image full width
 */
export function ClassicLayout({ 
  mediaItems, 
  gap = 16,
  className 
}: ClassicLayoutProps) {
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
      <div className={cn("w-full", className)}>
        <GalleryImage item={mediaItems[0]} />
      </div>
    );
  }

  // Two images: side by side
  if (count === 2) {
    return (
      <div 
        className={cn("grid grid-cols-2", className)}
        style={{ gap: `${gap}px` }}
      >
        {mediaItems.map((item) => (
          <GalleryImage key={item.id} item={item} />
        ))}
      </div>
    );
  }

  // Three images: 2 on first row, 1 full width on second
  if (count === 3) {
    return (
      <div className={cn("space-y-0", className)} style={{ gap: `${gap}px` }}>
        <div className="grid grid-cols-2 mb-0" style={{ gap: `${gap}px`, marginBottom: `${gap}px` }}>
          <GalleryImage item={mediaItems[0]} />
          <GalleryImage item={mediaItems[1]} />
        </div>
        <GalleryImage item={mediaItems[2]} />
      </div>
    );
  }

  // Four images: 2x2 grid
  if (count === 4) {
    return (
      <div 
        className={cn("grid grid-cols-2", className)}
        style={{ gap: `${gap}px` }}
      >
        {mediaItems.map((item) => (
          <GalleryImage key={item.id} item={item} />
        ))}
      </div>
    );
  }

  // 5+ images: Process in groups of 4, last odd image full width
  const rows: MediaItem[][] = [];
  let i = 0;
  
  while (i < count) {
    const remaining = count - i;
    
    if (remaining === 1) {
      // Last single image: full width
      rows.push([mediaItems[i]]);
      i++;
    } else if (remaining === 2) {
      // Last two images: side by side
      rows.push([mediaItems[i], mediaItems[i + 1]]);
      i += 2;
    } else if (remaining === 3) {
      // Last three images: 2 + 1
      rows.push([mediaItems[i], mediaItems[i + 1]]);
      rows.push([mediaItems[i + 2]]);
      i += 3;
    } else {
      // 4 or more: take 4 in 2x2 grid
      rows.push([mediaItems[i], mediaItems[i + 1]]);
      rows.push([mediaItems[i + 2], mediaItems[i + 3]]);
      i += 4;
    }
  }

  return (
    <div className={cn("flex flex-col", className)} style={{ gap: `${gap}px` }}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "grid",
            row.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}
          style={{ gap: `${gap}px` }}
        >
          {row.map((item) => (
            <GalleryImage key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Gallery image component with responsive sizing
 */
function GalleryImage({ item }: { item: MediaItem }) {
  return (
    <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden bg-muted">
      <Image
        src={item.url}
        alt={item.alt || item.originalName}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  );
}

