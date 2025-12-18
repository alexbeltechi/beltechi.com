"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Entry, MediaItem } from "@/lib/cms/types";

interface PostGridProps {
  posts: Entry[];
  mediaMap: Map<string, MediaItem>;
}

export function PostGrid({ posts, mediaMap }: PostGridProps) {
  const [columns, setColumns] = useState(5);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) setColumns(2);
      else if (width < 1024) setColumns(3);
      else if (width < 1280) setColumns(4);
      else if (width < 1680) setColumns(5);
      else setColumns(6);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  // Get cover media item for each post (uses coverMediaId, falls back to first)
  const getPostThumbnail = (post: Entry): MediaItem | null => {
    const mediaIds = post.data.media as string[];
    if (!mediaIds || mediaIds.length === 0) return null;
    
    // Use coverMediaId if available, otherwise fall back to first image
    const coverMediaId = post.data.coverMediaId as string | undefined;
    if (coverMediaId && mediaMap.has(coverMediaId)) {
      return mediaMap.get(coverMediaId) || null;
    }
    
    return mediaMap.get(mediaIds[0]) || null;
  };

  // Distribute posts into columns for masonry effect
  const distributeItems = useCallback(() => {
    const columnArrays: Array<{ post: Entry; media: MediaItem }[]> = Array.from(
      { length: columns },
      () => []
    );
    const columnHeights = Array(columns).fill(0);

    posts.forEach((post) => {
      const media = getPostThumbnail(post);
      if (!media) return;

      const aspectRatio =
        media.width && media.height ? media.width / media.height : 1;

      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      columnArrays[shortestColumn].push({ post, media });
      columnHeights[shortestColumn] += 288 / aspectRatio;
    });

    return columnArrays;
  }, [posts, columns, mediaMap]);

  const columnArrays = distributeItems();

  if (posts.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-body text-mid-grey">No posts yet</p>
          <p className="text-body text-light-grey mt-2">
            Create your first post in the admin panel
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-[10px] px-[10px] pb-[10px]">
      {columnArrays.map((columnItems, columnIndex) => (
        <div key={columnIndex} className="flex flex-1 flex-col gap-[10px]">
          {columnItems.map(({ post, media }) => {
            const aspectRatio =
              media.width && media.height ? media.width / media.height : 1;

            return (
              <Link
                key={post.id}
                href={`/post/${post.slug}`}
                className="relative block w-full overflow-hidden focus:outline-none rounded-none hover:rounded-[24px] transition-[border-radius] duration-300"
                style={{ aspectRatio }}
              >
                <Image
                  src={media.url}
                  alt={(post.data.title as string) || post.slug}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                  className="object-cover"
                  loading="lazy"
                />
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

