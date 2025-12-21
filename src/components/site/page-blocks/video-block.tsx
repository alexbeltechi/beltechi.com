"use client";

import type { PageVideoBlock } from "@/lib/cms/page-blocks";
import { parseVideoUrl } from "@/lib/cms/page-blocks";

interface VideoBlockComponentProps {
  block: PageVideoBlock;
  isMobile?: boolean;
}

export function VideoBlockComponent({ block }: VideoBlockComponentProps) {
  const { url, caption, aspectRatio = '16:9' } = block.data;

  const { provider, id } = parseVideoUrl(url);

  if (!provider || !id) {
    return (
      <div className="bg-muted rounded-lg aspect-video flex items-center justify-center text-muted-foreground">
        Invalid video URL. Paste a YouTube or Vimeo link.
      </div>
    );
  }

  const aspectClass = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
  }[aspectRatio];

  const embedUrl = provider === 'youtube'
    ? `https://www.youtube.com/embed/${id}`
    : `https://player.vimeo.com/video/${id}`;

  return (
    <figure>
      <div className={`relative ${aspectClass} rounded-lg overflow-hidden bg-black`}>
        <iframe
          src={embedUrl}
          title={caption || 'Video embed'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
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

