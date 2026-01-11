"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, ChevronLeft, ChevronRight } from "lucide-react";
import { GalleryLightbox } from "@/components/shared/gallery-lightbox";
import type { Entry, MediaItem } from "@/lib/cms/types";

// Aspect ratio constraints (width/height)
const MIN_ASPECT_RATIO = 9 / 16; // 0.5625 - portrait limit
const MAX_ASPECT_RATIO = 16 / 9; // 1.78 - landscape limit

// Drag threshold constants
const MIN_SWIPE_DISTANCE = 50;
const DIRECTION_THRESHOLD = 10;

interface PostCardProps {
  post: Entry;
  mediaItems: MediaItem[]; // All media for this post
  categoryMap: Map<string, { id: string; slug: string; label: string }>;
}

function PostCard({ post, mediaItems, categoryMap }: PostCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const directionLock = useRef<"horizontal" | "vertical" | null>(null);
  const dragDistance = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Only posts (not articles) can have carousel/lightbox behavior
  const isCarouselPost = post.collection === "posts" && mediaItems.length > 1;
  const currentMedia = mediaItems[currentIndex];
  
  if (!currentMedia) return null;
  
  // For carousels: use the tallest image's aspect ratio (smallest ratio = tallest)
  // For single images: use the image's own aspect ratio
  // All clamped between MIN and MAX
  const containerAspectRatio = (() => {
    if (isCarouselPost) {
      // Find the smallest (tallest) aspect ratio across all images
      let minRatio = MAX_ASPECT_RATIO;
      for (const media of mediaItems) {
        if (media.width && media.height) {
          const ratio = media.width / media.height;
          const clamped = Math.max(MIN_ASPECT_RATIO, Math.min(MAX_ASPECT_RATIO, ratio));
          if (clamped < minRatio) minRatio = clamped;
        }
      }
      return minRatio;
    } else {
      const rawAspectRatio = currentMedia.width && currentMedia.height 
        ? currentMedia.width / currentMedia.height 
        : 1;
      return Math.max(MIN_ASPECT_RATIO, Math.min(MAX_ASPECT_RATIO, rawAspectRatio));
    }
  })();
  
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
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < mediaItems.length - 1;

  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (canGoPrevious) {
      setIsLoaded(false);
      setCurrentIndex(prev => prev - 1);
    }
  }, [canGoPrevious]);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (canGoNext) {
      setIsLoaded(false);
      setCurrentIndex(prev => prev + 1);
    }
  }, [canGoNext]);

  // Drag end handler
  const handleDragEnd = useCallback(() => {
    if (dragStartX.current === null) {
      setIsDragging(false);
      setDragOffset(0);
      directionLock.current = null;
      dragDistance.current = 0;
      return;
    }

    const distance = -dragOffset;

    if (directionLock.current === "horizontal") {
      if (distance > MIN_SWIPE_DISTANCE && canGoNext) {
        goToNext();
      } else if (distance < -MIN_SWIPE_DISTANCE && canGoPrevious) {
        goToPrevious();
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    dragStartX.current = null;
    dragStartY.current = null;
    directionLock.current = null;
  }, [dragOffset, canGoNext, canGoPrevious, goToNext, goToPrevious]);

  // Handle click to open lightbox (only if it wasn't a drag)
  const handleImageClick = useCallback(() => {
    if (isCarouselPost && dragDistance.current < 10) {
      setLightboxOpen(true);
    }
    dragDistance.current = 0;
  }, [isCarouselPost]);

  // Touch and mouse drag support for carousel posts
  useEffect(() => {
    if (!isCarouselPost) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      dragStartX.current = e.touches[0].clientX;
      dragStartY.current = e.touches[0].clientY;
      directionLock.current = null;
      dragDistance.current = 0;
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (dragStartX.current === null || dragStartY.current === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - dragStartX.current;
      const deltaY = currentY - dragStartY.current;
      
      dragDistance.current = Math.max(dragDistance.current, Math.abs(deltaX), Math.abs(deltaY));

      if (directionLock.current === null) {
        if (Math.abs(deltaX) > DIRECTION_THRESHOLD || Math.abs(deltaY) > DIRECTION_THRESHOLD) {
          directionLock.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        }
      }

      if (directionLock.current === "vertical") return;

      if (directionLock.current === "horizontal") {
        e.preventDefault();
        e.stopPropagation();
        
        let offset = deltaX;
        if (
          (currentIndex === 0 && offset > 0) ||
          (currentIndex === mediaItems.length - 1 && offset < 0)
        ) {
          offset = offset * 0.3; // Resistance at edges
        }
        setDragOffset(offset);
      }
    };

    const handleTouchEnd = () => handleDragEnd();

    // Mouse events for desktop drag
    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return; // Ignore button clicks
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      directionLock.current = null;
      dragDistance.current = 0;
      setIsDragging(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (dragStartX.current === null || dragStartY.current === null) return;

      const deltaX = e.clientX - dragStartX.current;
      const deltaY = e.clientY - dragStartY.current;
      
      dragDistance.current = Math.max(dragDistance.current, Math.abs(deltaX), Math.abs(deltaY));

      if (directionLock.current === null) {
        if (Math.abs(deltaX) > DIRECTION_THRESHOLD || Math.abs(deltaY) > DIRECTION_THRESHOLD) {
          directionLock.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        }
      }

      if (directionLock.current === "horizontal") {
        let offset = deltaX;
        if (
          (currentIndex === 0 && offset > 0) ||
          (currentIndex === mediaItems.length - 1 && offset < 0)
        ) {
          offset = offset * 0.3;
        }
        setDragOffset(offset);
      }
    };

    const handleMouseUp = () => handleDragEnd();
    const handleMouseLeave = () => {
      if (isDragging) handleDragEnd();
    };

    // Add listeners
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isCarouselPost, isDragging, handleDragEnd, currentIndex, mediaItems.length]);

  // For articles and single-image posts, wrap entire card in Link
  // For carousel posts, only text area links to detail page
  if (!isCarouselPost) {
    return (
      <Link href={postUrl} className="block group">
        {/* Image Area */}
        <div
          className="relative w-full overflow-hidden border-faint"
          style={{ aspectRatio: containerAspectRatio }}
        >
          {imageUrl ? (
            <>
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
                className={`object-contain transition-opacity duration-500 relative z-10 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
              />
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.05] transition-opacity duration-200 pointer-events-none z-20" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
            </div>
          )}
        </div>

        {/* Text Area */}
        <div className="mt-3">
          <h3 className="text-[15px] font-bold text-black dark:text-white leading-[1.4]">
            {(post.data.title as string) || post.slug}
          </h3>
          {description && (
            <p className="mt-2 text-[15px] font-normal text-neutral-500 dark:text-neutral-400 leading-[1.4] tracking-[0.15px]">
              {description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[15px] font-medium leading-[1.4]">
            {postCategories.map((cat, idx) => (
              <span key={idx} className="text-black dark:text-white">{cat}</span>
            ))}
            <span className="text-[#999]">{formatDate(postDate)}</span>
          </div>
        </div>
      </Link>
    );
  }

  // Carousel post card (posts with multiple images) with drag support
  return (
    <>
      <div className="block group">
        {/* Image Area - with drag and lightbox */}
        <div
          ref={containerRef}
          className={`relative w-full overflow-hidden border-faint ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ aspectRatio: containerAspectRatio }}
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
              
              {/* Image with drag transform */}
              <div 
                className={`absolute inset-0 flex items-center justify-center ${
                  isDragging ? '' : 'transition-transform duration-300 ease-out'
                }`}
                style={{ transform: `translateX(${dragOffset}px)` }}
              >
                <Image
                  src={imageUrl}
                  alt={(post.data.title as string) || post.slug}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                  quality={60}
                  className={`object-contain transition-opacity duration-500 ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ pointerEvents: 'none' }}
                  loading="lazy"
                  onLoad={() => setIsLoaded(true)}
                  draggable={false}
                />
              </div>
              
              {/* Hover brighten overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.05] transition-opacity duration-200 pointer-events-none z-20" />
              
              {/* Carousel Controls */}
              <>
                {/* Navigation Buttons - always visible */}
                <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-30">
                  <button
                    onClick={goToPrevious}
                    disabled={!canGoPrevious}
                    className={`w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center pointer-events-auto transition-opacity ${
                      !canGoPrevious ? 'opacity-40 cursor-not-allowed' : 'opacity-70 hover:opacity-100'
                    }`}
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={goToNext}
                    disabled={!canGoNext}
                    className={`w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center pointer-events-auto transition-opacity ${
                      !canGoNext ? 'opacity-40 cursor-not-allowed' : 'opacity-70 hover:opacity-100'
                    }`}
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </button>
                </div>
                
                {/* Counter Badge - top right */}
                <div className="absolute top-3 right-3 z-30">
                  <div 
                    className="bg-zinc-700 text-white text-[12px] font-normal tracking-[0.12px] px-1.5 py-1 rounded-lg leading-none"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {currentIndex + 1}/{mediaItems.length}
                  </div>
                </div>
              </>
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

      // For carousels, find the tallest image (smallest aspect ratio)
      // For single items, use the image's ratio
      let containerAspectRatio = MAX_ASPECT_RATIO;
      if (post.collection === "posts" && mediaItems.length > 1) {
        // Carousel: find smallest (tallest) ratio
        for (const media of mediaItems) {
          if (media.width && media.height) {
            const ratio = media.width / media.height;
            const clamped = Math.max(MIN_ASPECT_RATIO, Math.min(MAX_ASPECT_RATIO, ratio));
            if (clamped < containerAspectRatio) containerAspectRatio = clamped;
          }
        }
      } else {
        const firstMedia = mediaItems[0];
        const rawAspectRatio =
          firstMedia.width && firstMedia.height ? firstMedia.width / firstMedia.height : 1;
        containerAspectRatio = Math.max(MIN_ASPECT_RATIO, Math.min(MAX_ASPECT_RATIO, rawAspectRatio));
      }

      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      columnArrays[shortestColumn].push({ post, mediaItems });
      // Add extra height for title, description and meta (approx 100px for cards with description)
      const hasDescription = Boolean(post.data.description);
      columnHeights[shortestColumn] += 288 / containerAspectRatio + (hasDescription ? 120 : 80);
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
