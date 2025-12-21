"use client";

import Image from "next/image";
import type { PageImageBlock } from "@/lib/cms/page-blocks";
import { aspectRatios } from "@/lib/design-tokens";

interface ImageBlockComponentProps {
  block: PageImageBlock;
  isMobile?: boolean;
  // For server-side rendering, pass the resolved media
  mediaUrl?: string;
  mediaAlt?: string;
  mediaWidth?: number;
  mediaHeight?: number;
}

export function ImageBlockComponent({ 
  block, 
  mediaUrl,
  mediaAlt,
  mediaWidth = 1200,
  mediaHeight = 800,
}: ImageBlockComponentProps) {
  const { caption, alt, aspectRatio = 'auto', fullWidth } = block.data;

  if (!mediaUrl) {
    return (
      <div className="bg-muted rounded-lg aspect-video flex items-center justify-center text-muted-foreground">
        No image selected
      </div>
    );
  }

  const aspectStyle = aspectRatio !== 'auto' 
    ? { aspectRatio: aspectRatios[aspectRatio] }
    : undefined;

  return (
    <figure className={fullWidth ? 'w-full' : ''}>
      <div 
        className="relative overflow-hidden rounded-lg"
        style={aspectStyle}
      >
        <Image
          src={mediaUrl}
          alt={alt || mediaAlt || ''}
          width={mediaWidth}
          height={mediaHeight}
          className={`w-full ${aspectRatio !== 'auto' ? 'object-cover h-full' : 'h-auto'}`}
        />
      </div>
      {caption && (
        <figcaption className="mt-3 text-sm text-muted-foreground text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

