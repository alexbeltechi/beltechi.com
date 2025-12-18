"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  // Find tallest aspect ratio
  const tallestAspectRatio = Math.min(
    ...validMedia.map((m) =>
      m.width && m.height ? m.width / m.height : 1
    )
  );

  useEffect(() => {
    const calculateHeight = () => {
      if (!containerRef.current) return;

      const hasMultiple = validMedia.length > 1;
      const maxHeight = window.innerHeight * (hasMultiple ? 0.75 : 0.8);
      const containerWidth = containerRef.current.offsetWidth;
      const padding = window.innerWidth >= 768 ? 80 : 32;
      const availableWidth = containerWidth - padding;
      const neededHeight = availableWidth / tallestAspectRatio;

      setContainerHeight(Math.min(neededHeight, maxHeight));
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    return () => window.removeEventListener("resize", calculateHeight);
  }, [validMedia.length, tallestAspectRatio]);

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
      return;
    }

    const distance = -dragOffset;

    if (distance > minSwipeDistance && canGoNext) {
      goToNext();
    } else if (distance < -minSwipeDistance && canGoPrevious) {
      goToPrevious();
    }

    setIsDragging(false);
    setDragOffset(0);
    dragStartX.current = null;
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
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || dragStartX.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    let offset = currentX - dragStartX.current;

    if (
      (currentIndex === 0 && offset > 0) ||
      (currentIndex === validMedia.length - 1 && offset < 0)
    ) {
      offset = offset * 0.3;
    }

    setDragOffset(offset);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (validMedia.length <= 1) return;
    e.preventDefault();
    dragStartX.current = e.clientX;
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

  const maxVh = hasMultiple ? "calc(80vh - 40px)" : "80vh";

  return (
    <div className="relative w-full bg-white overflow-hidden">
      <div
        ref={containerRef}
        className="relative w-full select-none"
        style={{
          height: containerHeight ? `${containerHeight}px` : maxVh,
          maxHeight: maxVh,
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
              className="flex items-center justify-center p-4"
              style={{ width: `${100 / validMedia.length}%` }}
            >
              {item.mime.startsWith("video/") ? (
                <video
                  src={item.url}
                  controls
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <Image
                  src={item.url}
                  alt={item.alt || item.originalName}
                  width={item.width || 1200}
                  height={item.height || 800}
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="max-h-full max-w-full object-contain pointer-events-none"
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
              className={`absolute left-4 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 bg-white border border-black transition-all ${
                canGoPrevious
                  ? "hover:bg-neutral-100 opacity-100"
                  : "opacity-30 cursor-not-allowed"
              }`}
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              disabled={!canGoNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 bg-white border border-black transition-all ${
                canGoNext
                  ? "hover:bg-neutral-100 opacity-100"
                  : "opacity-30 cursor-not-allowed"
              }`}
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div
          className="w-full flex items-center justify-center bg-white"
          style={{ gap: "6px" }}
        >
          {validMedia.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to image ${index + 1}`}
              style={{
                width: index === currentIndex ? 8 : 6,
                height: index === currentIndex ? 8 : 6,
                borderRadius: "50%",
                backgroundColor: index === currentIndex ? "#000" : "#d1d5db",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

