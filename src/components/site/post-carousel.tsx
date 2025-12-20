"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
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

  const onTouchStart = (e: React.TouchEvent) => {
    if (validMedia.length <= 1) return;
    dragStartX.current = e.targetTouches[0].clientX;
    dragStartY.current = e.targetTouches[0].clientY;
    directionLock.current = null;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || dragStartX.current === null || dragStartY.current === null) return;
    
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const deltaX = currentX - dragStartX.current;
    const deltaY = currentY - dragStartY.current;

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

  const onMouseDown = (e: React.MouseEvent) => {
    if (validMedia.length <= 1) return;
    e.preventDefault();
    dragStartX.current = e.clientX;
    directionLock.current = "horizontal"; // Mouse drag is always horizontal
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartX.current === null) return;
    const currentX = e.clientX;
    let offset = currentX - dragStartX.current;

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
    <div className="relative w-full bg-white dark:bg-zinc-950 overflow-hidden lg:px-4">
      <div
        ref={containerRef}
        className="relative w-full select-none overflow-hidden touch-pan-y"
        style={{
          aspectRatio: isDesktop ? "16/9" : `${mobileAspectRatio}`,
          cursor: hasMultiple ? (isDragging ? "grabbing" : "grab") : "default",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleDragEnd}
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
              className="relative h-full flex items-center justify-center overflow-hidden"
              style={{ width: `${100 / validMedia.length}%` }}
            >
              {item.mime.startsWith("video/") ? (
                <video
                  src={item.url}
                  controls
                  className="w-full h-auto lg:max-h-full lg:max-w-full lg:w-auto lg:object-contain"
                />
              ) : (
                <Image
                  src={item.url}
                  alt={item.alt || item.originalName}
                  width={item.width || 1200}
                  height={item.height || 800}
                  sizes="(max-width: 1024px) 100vw, 80vw"
                  className="w-full h-auto lg:max-h-full lg:max-w-full lg:w-auto lg:h-auto lg:object-contain pointer-events-none"
                  priority={index === currentIndex}
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>

        {hasMultiple && (
          <>
            <button
              onClick={goToPrevious}
              disabled={!canGoPrevious}
              className={`absolute left-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-9 h-9 rounded-md bg-white text-black dark:bg-black dark:text-white transition-all ${
                canGoPrevious
                  ? "hover:bg-gray-100 dark:hover:bg-zinc-900 opacity-100"
                  : "opacity-30 cursor-not-allowed"
              }`}
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              disabled={!canGoNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-9 h-9 rounded-md bg-white text-black dark:bg-black dark:text-white transition-all ${
                canGoNext
                  ? "hover:bg-gray-100 dark:hover:bg-zinc-900 opacity-100"
                  : "opacity-30 cursor-not-allowed"
              }`}
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div
          className="w-full flex items-center justify-center bg-white dark:bg-zinc-950 pt-4"
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
    </div>
  );
}

