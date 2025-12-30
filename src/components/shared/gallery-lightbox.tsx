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
 * Universal Lightbox Component
 * 
 * Full-screen image viewer with:
 * - 100vh x 100vw viewport coverage
 * - Original aspect ratio preservation
 * - Status indicator (current/total)
 * - Swipe/drag navigation
 * - Keyboard navigation (arrows, escape)
 * - Dot indicators
 * 
 * Used in:
 * - Article galleries
 * - Post carousels
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
  const dragStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  // Sync initial index when it changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Handle image load complete
  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };

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
      const diff = clientX - dragStartX.current;

      setDragOffset(diff);
    },
    [isDragging]
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
  const currentItem = mediaItems[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950"
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Close button - top right */}
      <div className="absolute top-4 right-4 z-[110]">
        <Button
          onClick={onClose}
          variant="secondary"
          size="icon-lg"
          aria-label="Close"
        >
          <X />
        </Button>
      </div>

      {/* Status indicator - top left */}
      {hasMultiple && (
        <div className="absolute top-4 left-4 z-[110]">
          <div className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-medium">
            {currentIndex + 1}/{mediaItems.length}
          </div>
        </div>
      )}

      {/* Image container - full screen */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center select-none"
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
        {/* Current image */}
        <div 
          className="w-full h-full flex items-center justify-center px-4 lg:px-20 py-16"
          style={{
            transform: isDragging ? `translateX(${dragOffset}px)` : "translateX(0)",
            transition: isDragging ? "none" : "transform 200ms ease-out",
          }}
        >
          {currentItem.mime.startsWith("video/") ? (
            <video
              src={currentItem.url}
              poster={currentItem.poster?.url}
              controls
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: "calc(100vh - 128px)" }}
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Show blur background while loading (50% opacity) */}
              {currentItem.blurDataURL && !loadedImages.has(currentIndex) && (
                <div 
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundImage: `url(${currentItem.blurDataURL})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(20px)',
                    transform: 'scale(1.1)',
                  }}
                />
              )}
              <Image
                key={currentItem.id}
                src={currentItem.url}
                alt={currentItem.alt || currentItem.originalName}
                width={currentItem.width || 2000}
                height={currentItem.height || 1500}
                className="max-w-full max-h-full w-auto h-auto object-contain relative z-10"
                style={{ maxHeight: "calc(100vh - 128px)" }}
                sizes="100vw"
                quality={85}
                priority
                onLoad={() => handleImageLoad(currentIndex)}
                draggable={false}
              />
            </div>
          )}
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

      {/* Dot indicators - bottom center */}
      {hasMultiple && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center z-[110]"
          style={{ gap: "6px" }}
        >
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to image ${index + 1}`}
              className={`rounded-full border-none p-0 cursor-pointer transition-all ${
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
