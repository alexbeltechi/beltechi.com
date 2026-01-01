import type { MediaItem } from "@/lib/cms/types";

/**
 * Gallery layout presets
 */
export type GalleryLayout = 
  | 'classic'      // WordPress-style smart auto-layout
  | 'grid'         // Fixed column grid
  | 'masonry'      // Future: Pinterest-style
  | 'carousel';    // Future: Slideshow

/**
 * Gallery width options for breakout layouts
 */
export type GalleryWidth = 'normal' | 'large' | 'full';

/**
 * Unified gallery props used across the application
 */
export interface GalleryProps {
  /** Resolved media items to display */
  mediaItems: MediaItem[];
  
  /** Layout preset */
  layout?: GalleryLayout;
  
  /** Gap between images in pixels (default: 16) */
  gap?: number;
  
  /** For grid layout: number of columns (default: 3) */
  columns?: number;
  
  /** Optional CSS class name */
  className?: string;
  
  /** Whether this is mobile view (for future responsive logic) */
  isMobile?: boolean;
  
  /** Optional aspect ratio for images */
  aspectRatio?: string;
  
  /** Width option: normal (default), large (breakout with margins), full (edge to edge) */
  width?: GalleryWidth;
}

/**
 * Gallery layout metadata
 */
export interface GalleryLayoutMeta {
  label: string;
  description: string;
  supportsColumns?: boolean;
}

export const galleryLayoutMeta: Record<GalleryLayout, GalleryLayoutMeta> = {
  classic: {
    label: 'Classic',
    description: 'Alternating layout: 1 full width, then 2 side-by-side, repeat',
    supportsColumns: false,
  },
  grid: {
    label: 'Grid',
    description: 'Fixed column grid with equal spacing',
    supportsColumns: true,
  },
  masonry: {
    label: 'Masonry',
    description: 'Pinterest-style staggered layout (coming soon)',
    supportsColumns: false,
  },
  carousel: {
    label: 'Carousel',
    description: 'Slideshow with navigation (coming soon)',
    supportsColumns: false,
  },
};

