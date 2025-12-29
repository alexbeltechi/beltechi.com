"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryLightbox } from "@/components/shared/gallery-lightbox";
import type { MediaItem } from "@/lib/cms/types";

interface PostCarouselProps {
  media: (MediaItem | undefined)[];
  initialIndex?: number;
}

export function PostCarousel({ media, initialIndex = 0 }: PostCarouselProps) {
  const validMedia = media.filter(Boolean) as MediaItem[];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragDistance = useRef<number>(0);
  const directionLock = useRef<"horizontal" | "vertical" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const directionThreshold = 10; // pixels to determine direction

  // Track if desktop for aspect ratio handling
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Calculate optimal aspect ratio for mobile container
  // Uses the tallest image's aspect ratio, capped at 3:4 (0.75)
  const mobileAspectRatio = useMemo(() => {
    const minRatio = 3 / 4; // 0.75 - cap for very tall images
    
    // Get aspect ratios of all images (width/height)
    const ratios = validMedia.map((item) => {
      if (item.width && item.height) {
        return item.width / item.height;
      }
      return 1; // default to 1:1 if no dimensions
    });

    if (ratios.length === 0) return minRatio;

    // Find the smallest ratio (tallest image)
    const tallestRatio = Math.min(...ratios);

    // Return the tallest ratio, but cap at 3:4
    return Math.max(tallestRatio, minRatio);
  }, [validMedia]);

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < validMedia.length - 1;

  const goToPrevious = useCallback(() => {
    if (!canGoPrevious) return;
    setCurrentIndex((prev) => prev - 1);
  }, [canGoPrevious]);

  const goToNext = useCallback(() => {
    if (!canGoNext) return;
    setCurrentIndex((prev) => prev + 1);
  }, [canGoNext]);

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
      if (distance > minSwipeDistance && canGoNext) {
        goToNext();
      } else if (distance < -minSwipeDistance && canGoPrevious) {
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
    // Only open lightbox if drag distance was minimal (not a swipe)
    if (dragDistance.current < 10) {
      setLightboxOpen(true);
    }
    dragDistance.current = 0;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (e.key === "ArrowLeft") goToPrevious();
      else if (e.key === "ArrowRight") goToNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Use native touch events with passive: false to properly prevent scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container || validMedia.length <= 1) return;

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
      
      // Track total drag distance
      dragDistance.current = Math.max(dragDistance.current, Math.abs(deltaX), Math.abs(deltaY));

      // Determine direction lock if not yet set
      if (directionLock.current === null) {
        if (Math.abs(deltaX) > directionThreshold || Math.abs(deltaY) > directionThreshold) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            directionLock.current = "horizontal";
          } else {
            directionLock.current = "vertical";
          }
        }
      }

      // If locked to vertical, let browser handle scroll
      if (directionLock.current === "vertical") {
        return;
      }

      // If locked to horizontal, prevent scroll and handle carousel
      if (directionLock.current === "horizontal") {
        e.preventDefault();
        e.stopPropagation();
        
        let offset = deltaX;
        if (
          (currentIndex === 0 && offset > 0) ||
          (currentIndex === validMedia.length - 1 && offset < 0)
        ) {
          offset = offset * 0.3;
        }
        setDragOffset(offset);
      }
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    // Add listeners with passive: false to allow preventDefault
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [validMedia.length, currentIndex, handleDragEnd, directionThreshold]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (validMedia.length <= 1) return;
    e.preventDefault();
    dragStartX.current = e.clientX;
    directionLock.current = "horizontal"; // Mouse drag is always horizontal
    dragDistance.current = 0;
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartX.current === null) return;
    const currentX = e.clientX;
    let offset = currentX - dragStartX.current;
    
    // Track total drag distance
    dragDistance.current = Math.max(dragDistance.current, Math.abs(offset));

    if (
      (currentIndex === 0 && offset > 0) ||
      (currentIndex === validMedia.length - 1 && offset < 0)
    ) {
      offset = offset * 0.3;
    }

    setDragOffset(offset);
  };

  if (validMedia.length === 0) return null;

  const hasMultiple = validMedia.length > 1;

  const getSlideTransform = () => {
    const imageWidthPercent = 100 / validMedia.length;
    const baseOffset = -currentIndex * imageWidthPercent;
    const dragPercent = containerRef.current
      ? (dragOffset / containerRef.current.offsetWidth) * imageWidthPercent
      : 0;
    return `translateX(${baseOffset + dragPercent}%)`;
  };

  return (
    <div className="relative w-full bg-white dark:bg-zinc-950 overflow-hidden">
      <div
        ref={containerRef}
        className="relative w-full select-none overflow-hidden"
        style={{
          ...(isDesktop 
            ? { height: "90vh" } 
            : { aspectRatio: `${mobileAspectRatio}` }
          ),
          cursor: hasMultiple ? (isDragging ? "grabbing" : "grab") : "default",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <div
          className="flex h-full"
          style={{
            transform: getSlideTransform(),
            transition: isDragging ? "none" : "transform 300ms ease-out",
            width: `${validMedia.length * 100}%`,
          }}
        >
          {validMedia.map((item, index) => (
            <div
              key={item.id}
              className="relative h-full flex items-center justify-center overflow-hidden p-0 lg:p-10 cursor-pointer"
              style={{ width: `${100 / validMedia.length}%` }}
              onClick={handleImageClick}
            >
              {item.mime.startsWith("video/") ? (
                <video
                  src={item.url}
                  poster={item.poster?.url}
                  controls
                  className="w-full h-auto lg:max-h-full lg:max-w-full lg:w-auto lg:object-contain"
                  onClick={(e) => e.stopPropagation()} // Don't open lightbox when clicking video controls
                />
              ) : (
                <Image
                  src={item.url}
                  alt={item.alt || item.originalName}
                  width={item.width || 1200}
                  height={item.height || 800}
                  sizes="(max-width: 1024px) 100vw, 80vw"
                  className="w-full h-auto lg:max-h-full lg:max-w-full lg:w-auto lg:object-contain pointer-events-none"
                  priority={index === currentIndex}
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>

        {hasMultiple && (
          <>
            <Button
              onClick={goToPrevious}
              disabled={!canGoPrevious}
              variant="secondary"
              size="icon-lg"
              className="absolute left-4 top-1/2 -translate-y-1/2 hidden lg:flex"
              aria-label="Previous"
            >
              <ChevronLeft />
            </Button>
            <Button
              onClick={goToNext}
              disabled={!canGoNext}
              variant="secondary"
              size="icon-lg"
              className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex"
              aria-label="Next"
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div
          className="w-full flex items-center justify-center bg-white dark:bg-zinc-950 pt-4 pb-4"
          style={{ gap: "6px" }}
        >
          {validMedia.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to image ${index + 1}`}
              className={`rounded-full border-none p-0 cursor-pointer ${
                index === currentIndex 
                  ? "w-2 h-2 bg-black dark:bg-white" 
                  : "w-1.5 h-1.5 bg-zinc-300 dark:bg-zinc-600"
              }`}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      <GalleryLightbox
        mediaItems={validMedia}
        initialIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}

