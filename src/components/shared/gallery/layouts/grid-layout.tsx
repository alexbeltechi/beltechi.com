"use client";

import Image from "next/image";
import type { MediaItem } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

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
  if (mediaItems.length === 0) {
    return (
      <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
        No images in gallery
      </div>
    );
  }

  return (
    <div 
      className={cn("grid", className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {mediaItems.map((item) => (
        <div
          key={item.id}
          className="relative w-full rounded-lg overflow-hidden bg-muted"
          style={{ aspectRatio }}
        >
          <Image
            src={item.url}
            alt={item.alt || item.originalName}
            fill
            className="object-cover"
            sizes={`(max-width: 768px) ${100 / columns}vw, ${100 / columns}vw`}
          />
        </div>
      ))}
    </div>
  );
}

