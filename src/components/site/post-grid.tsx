"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, ChevronLeft, ChevronRight } from "lucide-react";
import { GalleryLightbox } from "@/components/shared/gallery-lightbox";
import type { Entry, MediaItem } from "@/lib/cms/types";

interface PostCardProps {
  post: Entry;
  mediaItems: MediaItem[]; // All media for this post
  categoryMap: Map<string, { id: string; slug: string; label: string }>;
}

function PostCard({ post, mediaItems, categoryMap }: PostCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  const hasMultipleImages = mediaItems.length > 1;
  const currentMedia = mediaItems[currentIndex];
  
  if (!currentMedia) return null;
  
  const aspectRatio = currentMedia.width && currentMedia.height 
    ? currentMedia.width / currentMedia.height 
    : 1;
  
  const getPostCategories = (post: Entry): string[] => {
    const categoryIds = (post.data.categories as string[]) || [];
    return categoryIds
      .slice(0, 3)
      .map((id) => categoryMap.get(id)?.label || id)
      .filter(Boolean);
  };

  const postCategories = getPostCategories(post);
  const postDate = (post.data.date as string) || post.createdAt;
  const description = post.data.description as string | undefined;
  
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
  const isVideo = currentMedia.mime.startsWith("video/");
  const imageUrl = isVideo 
    ? (currentMedia.poster?.url || null)
    : (currentMedia.variants?.thumb?.url || currentMedia.url);

  // Get blur placeholder for instant loading
  const blurDataURL = currentMedia.blurDataURL;

  // Navigation handlers
  const goToPrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentIndex > 0) {
      setIsLoaded(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentIndex < mediaItems.length - 1) {
      setIsLoaded(false);
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Handle image click - open lightbox
  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="block group">
        {/* Image Area - clickable for lightbox */}
        <div
          className="relative w-full overflow-hidden cursor-pointer"
          style={{ aspectRatio }}
          onClick={handleImageClick}
        >
          {imageUrl ? (
            <>
              {/* Blur placeholder - fades out as image fades in */}
              {blurDataURL && (
                <div 
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    isLoaded ? 'opacity-0' : 'opacity-100'
                  }`}
                  style={{
                    backgroundImage: `url(${blurDataURL})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(20px)',
                    transform: 'scale(1.1)',
                  }}
                />
              )}
              {/* Fallback grey for images without blur */}
              {!blurDataURL && (
                <div className={`absolute inset-0 bg-zinc-50 dark:bg-zinc-900 transition-opacity duration-500 ${
                  isLoaded ? 'opacity-0' : 'opacity-100'
                }`} />
              )}
              <Image
                src={imageUrl}
                alt={(post.data.title as string) || post.slug}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                quality={60}
                className={`object-cover transition-opacity duration-500 relative z-10 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
              />
              {/* Hover brighten overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.05] transition-opacity duration-200 pointer-events-none z-20" />
              
              {/* Carousel Controls - only for posts with multiple images */}
              {hasMultipleImages && (
                <>
                  {/* Navigation Buttons - always visible */}
                  <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-30">
                    <button
                      onClick={goToPrevious}
                      disabled={currentIndex === 0}
                      className={`w-6 h-6 rounded-full bg-white/60 flex items-center justify-center pointer-events-auto transition-opacity ${
                        currentIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/80'
                      }`}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-3 h-3 text-black" strokeWidth={2} />
                    </button>
                    <button
                      onClick={goToNext}
                      disabled={currentIndex === mediaItems.length - 1}
                      className={`w-6 h-6 rounded-full bg-white/60 flex items-center justify-center pointer-events-auto transition-opacity ${
                        currentIndex === mediaItems.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/80'
                      }`}
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-3 h-3 text-black" strokeWidth={2} />
                    </button>
                  </div>
                  
                  {/* Counter Badge - top right */}
                  <div className="absolute top-4 right-4 z-30">
                    <div className="bg-zinc-700 text-white text-[14px] font-normal tracking-[0.14px] px-1 py-0.5 rounded-lg leading-none">
                      {currentIndex + 1}/{mediaItems.length}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            /* Video without poster - show icon */
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
            </div>
          )}
        </div>

        {/* Text Area - clickable for navigation */}
        <Link href={postUrl} className="block mt-3">
          {/* Title */}
          <h3 className="text-[15px] font-bold text-black dark:text-white leading-[1.4]">
            {(post.data.title as string) || post.slug}
          </h3>

          {/* Description - if exists */}
          {description && (
            <p className="mt-2 text-[15px] font-normal text-neutral-500 dark:text-neutral-400 leading-[1.4] tracking-[0.15px]">
              {description}
            </p>
          )}

          {/* Categories + Date */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[15px] font-medium leading-[1.4]">
            {postCategories.map((cat, idx) => (
              <span key={idx} className="text-black dark:text-white">{cat}</span>
            ))}
            <span className="text-[#999]">{formatDate(postDate)}</span>
          </div>
        </Link>
      </div>

      {/* Lightbox */}
      <GalleryLightbox
        mediaItems={mediaItems}
        initialIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
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

  // Get all media items for a post (ordered)
  const getPostMediaItems = (post: Entry): MediaItem[] => {
    // For articles, use coverImage field only
    if (post.collection === "articles") {
      const coverImageId = post.data.coverImage as string | undefined;
      if (coverImageId && mediaMap.has(coverImageId)) {
        return [mediaMap.get(coverImageId)!];
      }
      return [];
    }
    
    // For posts, use media array (all images for carousel)
    const mediaIds = post.data.media as string[];
    if (!mediaIds || mediaIds.length === 0) return [];
    
    // Get coverMediaId for initial display order
    const coverMediaId = post.data.coverMediaId as string | undefined;
    
    // Return all media items, with cover first if specified
    const allMedia = mediaIds
      .map((id) => mediaMap.get(id))
      .filter((m): m is MediaItem => m !== undefined);
    
    if (coverMediaId) {
      const coverIndex = allMedia.findIndex((m) => m.id === coverMediaId);
      if (coverIndex > 0) {
        const cover = allMedia.splice(coverIndex, 1)[0];
        allMedia.unshift(cover);
      }
    }
    
    return allMedia;
  };

  // Get cover media item for masonry height calculation
  const getPostThumbnail = (post: Entry): MediaItem | null => {
    const mediaItems = getPostMediaItems(post);
    return mediaItems[0] || null;
  };

  // Distribute posts into columns for masonry effect
  const distributeItems = useCallback(() => {
    const columnArrays: Array<{ post: Entry; mediaItems: MediaItem[] }[]> = Array.from(
      { length: columns },
      () => []
    );
    const columnHeights = Array(columns).fill(0);

    posts.forEach((post) => {
      const mediaItems = getPostMediaItems(post);
      if (mediaItems.length === 0) return;

      const firstMedia = mediaItems[0];
      const aspectRatio =
        firstMedia.width && firstMedia.height ? firstMedia.width / firstMedia.height : 1;

      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      columnArrays[shortestColumn].push({ post, mediaItems });
      // Add extra height for title, description and meta (approx 100px for cards with description)
      const hasDescription = Boolean(post.data.description);
      columnHeights[shortestColumn] += 288 / aspectRatio + (hasDescription ? 120 : 80);
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
        <div key={columnIndex} className="flex flex-1 flex-col gap-6">
          {columnItems.map(({ post, mediaItems }) => (
            <PostCard 
              key={post.id} 
              post={post} 
              mediaItems={mediaItems} 
              categoryMap={categoryMap}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
