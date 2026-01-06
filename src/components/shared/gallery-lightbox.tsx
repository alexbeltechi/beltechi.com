"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "@/lib/cms/types";

interface GalleryLightboxProps {
  mediaItems: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Get the largest available image URL
 * Priority: display (2400px) → medium (1200px) → original url
 */
function getLargestImageUrl(item: MediaItem): string {
  return item.variants?.display?.url || item.variants?.medium?.url || item.url;
}

/**
 * Universal Lightbox Component
 * 
 * Full-screen image viewer with:
 * - 100vh x 100vw viewport coverage
 * - Carousel-style horizontal sliding animation
 * - Swipe/drag navigation
 * - Keyboard navigation (arrows, escape)
 */
export function GalleryLightbox({
  mediaItems,
  initialIndex,
  isOpen,
  onClose,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [skipTransition, setSkipTransition] = useState(true);
  const dragStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  // Handle lightbox open - skip animation on initial position
  useEffect(() => {
    if (isOpen) {
      // Immediately set index without animation
      setSkipTransition(true);
      setCurrentIndex(initialIndex);
      // After a frame, allow animations for navigation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSkipTransition(false);
        });
      });
    }
  }, [isOpen, initialIndex]);

  // Handle image load complete
  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };
  
  const isImageLoaded = (index: number) => loadedImages.has(index);

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < mediaItems.length - 1;

  const goToPrevious = useCallback(() => {
    if (!canGoPrevious) return;
    setCurrentIndex((prev) => prev - 1);
  }, [canGoPrevious]);

  const goToNext = useCallback(() => {
    if (!canGoNext) return;
    setCurrentIndex((prev) => prev + 1);
  }, [canGoNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Touch/Mouse handlers for swipe
  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (mediaItems.length <= 1) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    setIsDragging(true);
  }, [mediaItems.length]);

  const onDragMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging || dragStartX.current === null) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      let offset = clientX - dragStartX.current;

      // Add resistance at edges
      if (
        (currentIndex === 0 && offset > 0) ||
        (currentIndex === mediaItems.length - 1 && offset < 0)
      ) {
        offset = offset * 0.3;
      }

      setDragOffset(offset);
    },
    [isDragging, currentIndex, mediaItems.length]
  );

  const onDragEnd = useCallback(() => {
    if (!isDragging) return;

    if (Math.abs(dragOffset) > minSwipeDistance) {
      if (dragOffset > 0 && canGoPrevious) {
        goToPrevious();
      } else if (dragOffset < 0 && canGoNext) {
        goToNext();
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    dragStartX.current = null;
  }, [isDragging, dragOffset, canGoPrevious, canGoNext, goToPrevious, goToNext]);

  if (!isOpen) return null;

  const hasMultiple = mediaItems.length > 1;

  // Calculate transform for carousel-style sliding
  const getSlideTransform = () => {
    const imageWidthPercent = 100 / mediaItems.length;
    const baseOffset = -currentIndex * imageWidthPercent;
    const dragPercent = containerRef.current
      ? (dragOffset / containerRef.current.offsetWidth) * imageWidthPercent
      : 0;
    return `translateX(${baseOffset + dragPercent}%)`;
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950"
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Close button - top left */}
      <div className="absolute top-4 left-4 z-[110]">
        <Button
          onClick={onClose}
          variant="secondary"
          size="icon-lg"
          aria-label="Close"
        >
          <X />
        </Button>
      </div>

      {/* Status indicator - top right */}
      {hasMultiple && (
        <div className="absolute top-4 right-4 z-[110]">
          <div className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-medium">
            {currentIndex + 1}/{mediaItems.length}
          </div>
        </div>
      )}

      {/* Image container - full screen, carousel-style */}
      <div
        ref={containerRef}
        className="absolute inset-0 select-none overflow-hidden"
        style={{
          cursor: hasMultiple ? (isDragging ? "grabbing" : "grab") : "default",
        }}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
      >
        {/* Horizontal strip of all images */}
        <div
          className="flex h-full"
          style={{
            transform: getSlideTransform(),
            transition: isDragging || skipTransition ? "none" : "transform 300ms ease-out",
            width: `${mediaItems.length * 100}%`,
          }}
        >
          {mediaItems.map((item, index) => (
            <div
              key={item.id}
              className="relative h-full flex items-center justify-center"
              style={{ width: `${100 / mediaItems.length}%` }}
            >
              {item.mime.startsWith("video/") ? (
                <video
                  src={item.url}
                  poster={item.poster?.url}
                  controls
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <Image
                  key={item.id}
                  src={getLargestImageUrl(item)}
                  alt={item.alt || item.originalName}
                  width={item.variants?.display?.width || item.variants?.medium?.width || item.width || 2000}
                  height={item.variants?.display?.height || item.variants?.medium?.height || item.height || 1500}
                  className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 ${
                    isImageLoaded(index) ? 'opacity-100' : 'opacity-0'
                  }`}
                  sizes="100vw"
                  quality={90}
                  priority={Math.abs(index - currentIndex) <= 1}
                  onLoad={() => handleImageLoad(index)}
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation buttons (desktop only) */}
      {hasMultiple && (
        <>
          <Button
            onClick={goToPrevious}
            disabled={!canGoPrevious}
            variant="secondary"
            size="icon-lg"
            className="absolute left-4 top-1/2 -translate-y-1/2 hidden lg:flex z-[110]"
            aria-label="Previous"
          >
            <ChevronLeft />
          </Button>
          <Button
            onClick={goToNext}
            disabled={!canGoNext}
            variant="secondary"
            size="icon-lg"
            className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex z-[110]"
            aria-label="Next"
          >
            <ChevronRight />
          </Button>
        </>
      )}
    </div>
  );
}
