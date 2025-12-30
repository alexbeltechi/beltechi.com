"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film } from "lucide-react";
import type { Entry, MediaItem } from "@/lib/cms/types";

interface PostCardProps {
  post: Entry;
  media: MediaItem;
  categoryMap: Map<string, { id: string; slug: string; label: string }>;
}

function PostCard({ post, media, categoryMap }: PostCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  const aspectRatio = media.width && media.height ? media.width / media.height : 1;
  
  const getPostCategories = (post: Entry): string[] => {
    const categoryIds = (post.data.categories as string[]) || [];
    return categoryIds
      .slice(0, 3)
      .map((id) => categoryMap.get(id)?.label || id)
      .filter(Boolean);
  };

  const postCategories = getPostCategories(post);
  const postDate = (post.data.date as string) || post.createdAt;
  
  // Format date as "Aug 7, 2025"
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Determine the correct URL based on collection
  const postUrl = post.collection === "articles" ? `/article/${post.slug}` : `/post/${post.slug}`;

  // Handle video thumbnails - use poster if available
  const isVideo = media.mime.startsWith("video/");
  const imageUrl = isVideo 
    ? (media.poster?.url || null)
    : (media.variants?.thumb?.url || media.url);

  // Get blur placeholder for instant loading
  const blurDataURL = media.blurDataURL;

  return (
    <Link href={postUrl} className="block group">
      {/* Image */}
      <div
        className="relative w-full overflow-hidden bg-zinc-50 dark:bg-zinc-900"
        style={{ aspectRatio }}
      >
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={(post.data.title as string) || post.slug}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              quality={60}
              placeholder={blurDataURL ? "blur" : "empty"}
              blurDataURL={blurDataURL}
              className={`object-cover transition-opacity duration-500 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => setIsLoaded(true)}
            />
            {/* Hover brighten overlay */}
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.05] transition-opacity duration-200 pointer-events-none" />
          </>
        ) : (
          /* Video without poster - show icon */
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-3 text-[15px] font-bold text-black dark:text-white leading-tight">
        {(post.data.title as string) || post.slug}
      </h3>

      {/* Categories + Date */}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px]">
        {postCategories.map((cat, idx) => (
          <span key={idx} className="text-black dark:text-white">{cat}</span>
        ))}
        <span className="text-zinc-400">{formatDate(postDate)}</span>
      </div>
    </Link>
  );
}

interface Category {
  id: string;
  slug: string;
  label: string;
}

interface PostGridProps {
  posts: Entry[];
  mediaMap: Map<string, MediaItem>;
  categories: Category[];
}

export function PostGrid({ posts, mediaMap, categories }: PostGridProps) {
  const [columns, setColumns] = useState(5);

  // Create category lookup map
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

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
    // For articles, use coverImage field
    if (post.collection === "articles") {
      const coverImageId = post.data.coverImage as string | undefined;
      if (coverImageId && mediaMap.has(coverImageId)) {
        return mediaMap.get(coverImageId) || null;
      }
      return null;
    }
    
    // For posts, use media array
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
      // Add extra height for title and meta (approx 80px)
      columnHeights[shortestColumn] += 288 / aspectRatio + 80;
    });

    return columnArrays;
  }, [posts, columns, mediaMap]);

  const columnArrays = distributeItems();

  if (posts.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-body text-zinc-500">No posts yet</p>
          <p className="text-body text-zinc-400 mt-2">
            Create your first post in the admin panel
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 px-4 pb-4">
      {columnArrays.map((columnItems, columnIndex) => (
        <div key={columnIndex} className="flex flex-1 flex-col gap-4">
          {columnItems.map(({ post, media }) => (
            <PostCard 
              key={post.id} 
              post={post} 
              media={media} 
              categoryMap={categoryMap}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

