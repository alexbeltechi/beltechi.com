"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FadeInOnScrollProps {
  children: ReactNode;
  className?: string;
  /** Delay before animation starts (in ms) */
  delay?: number;
  /** How much of the element should be visible before triggering (0-1) */
  threshold?: number;
  /** Root margin to trigger earlier/later */
  rootMargin?: string;
  /** Animation duration in ms */
  duration?: number;
}

/**
 * Fade In On Scroll Component
 * 
 * Wraps content and reveals it with a pure fade-in effect
 * when it enters the viewport. Once visible, stays visible.
 * No position change - just opacity.
 */
export function FadeInOnScroll({
  children,
  className,
  delay = 0,
  threshold = 0.1,
  rootMargin = "0px 0px -50px 0px",
  duration = 600,
}: FadeInOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add delay if specified
          if (delay > 0) {
            setTimeout(() => setIsVisible(true), delay);
          } else {
            setIsVisible(true);
          }
          // Once visible, stop observing
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [delay, threshold, rootMargin]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-opacity ease-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

