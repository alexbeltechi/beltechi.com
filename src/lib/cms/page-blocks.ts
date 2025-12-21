/**
 * Page Block Types
 * 
 * Structured block definitions for the page builder.
 * Each block is typed data rendered by code - no HTML stored in content.
 */

import type { 
  SpacingKey, 
  ColumnCount, 
  AspectRatioKey, 
  ButtonVariant,
  DividerStyle,
  TextAlignment 
} from '../design-tokens';

// ============================================
// Base Block Interface
// ============================================

export interface BasePageBlock {
  id: string;
  type: PageBlockType;
  marginTop?: SpacingKey;
  marginBottom?: SpacingKey;
  // Mobile overrides
  mobile?: {
    marginTop?: SpacingKey;
    marginBottom?: SpacingKey;
  };
}

// ============================================
// Block Types
// ============================================

export type PageBlockType = 
  | 'hero'
  | 'text'
  | 'image'
  | 'gallery'
  | 'divider'
  | 'quote'
  | 'video'
  | 'button';

// ============================================
// Hero Block
// ============================================

export interface HeroBlock extends BasePageBlock {
  type: 'hero';
  data: {
    title: string;
    subtitle?: string;
    date?: string;
    categories?: string[]; // category IDs
    alignment?: TextAlignment;
  };
}

// ============================================
// Text Block
// ============================================

export interface PageTextBlock extends BasePageBlock {
  type: 'text';
  data: {
    content: string; // Markdown or plain text
    alignment?: TextAlignment;
  };
}

// ============================================
// Image Block
// ============================================

export interface PageImageBlock extends BasePageBlock {
  type: 'image';
  data: {
    mediaId: string;
    caption?: string;
    alt?: string;
    aspectRatio?: AspectRatioKey;
    fullWidth?: boolean;
  };
}

// ============================================
// Gallery Block
// ============================================

export interface PageGalleryBlock extends BasePageBlock {
  type: 'gallery';
  data: {
    mediaIds: string[];
    columns: ColumnCount;
    gap: SpacingKey;
    aspectRatio?: AspectRatioKey;
  };
  mobile?: BasePageBlock['mobile'] & {
    columns?: 1 | 2;
    gap?: SpacingKey;
  };
}

// ============================================
// Divider Block
// ============================================

export interface PageDividerBlock extends BasePageBlock {
  type: 'divider';
  data: {
    style: DividerStyle;
    spacing?: SpacingKey; // Additional vertical space
  };
}

// ============================================
// Quote Block
// ============================================

export interface PageQuoteBlock extends BasePageBlock {
  type: 'quote';
  data: {
    text: string;
    attribution?: string;
    alignment?: TextAlignment;
  };
}

// ============================================
// Video Block (Embed)
// ============================================

export interface PageVideoBlock extends BasePageBlock {
  type: 'video';
  data: {
    url: string; // YouTube or Vimeo URL
    caption?: string;
    aspectRatio?: '16:9' | '4:3' | '1:1';
  };
}

// ============================================
// Button Block
// ============================================

export interface PageButtonBlock extends BasePageBlock {
  type: 'button';
  data: {
    label: string;
    url: string;
    variant: ButtonVariant;
    alignment?: TextAlignment;
    openInNewTab?: boolean;
  };
}

// ============================================
// Union Type for All Blocks
// ============================================

export type PageBlock = 
  | HeroBlock
  | PageTextBlock
  | PageImageBlock
  | PageGalleryBlock
  | PageDividerBlock
  | PageQuoteBlock
  | PageVideoBlock
  | PageButtonBlock;

// ============================================
// Page Data Structure
// ============================================

export interface PageData {
  title: string;
  slug: string;
  description?: string;
  blocks: PageBlock[];
  settings?: {
    maxWidth?: 'narrow' | 'default' | 'wide' | 'full';
    topPadding?: SpacingKey;
    bottomPadding?: SpacingKey;
  };
  seo?: {
    title?: string;
    description?: string;
    image?: string; // media ID
  };
}

// ============================================
// Block Defaults (for creating new blocks)
// ============================================

export const blockDefaults: Record<PageBlockType, Omit<PageBlock, 'id'>> = {
  hero: {
    type: 'hero',
    marginBottom: 'lg',
    data: {
      title: 'Page Title',
      alignment: 'left',
    },
  },
  text: {
    type: 'text',
    marginBottom: 'md',
    data: {
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      alignment: 'left',
    },
  },
  image: {
    type: 'image',
    marginBottom: 'md',
    data: {
      mediaId: '',
      aspectRatio: 'auto',
      fullWidth: false,
    },
  },
  gallery: {
    type: 'gallery',
    marginBottom: 'md',
    data: {
      mediaIds: [],
      columns: 3,
      gap: 'sm',
      aspectRatio: 'auto',
    },
    mobile: {
      columns: 1,
    },
  },
  divider: {
    type: 'divider',
    marginTop: 'md',
    marginBottom: 'md',
    data: {
      style: 'line',
    },
  },
  quote: {
    type: 'quote',
    marginBottom: 'md',
    data: {
      text: 'Enter your quote here...',
      alignment: 'left',
    },
  },
  video: {
    type: 'video',
    marginBottom: 'md',
    data: {
      url: '',
      aspectRatio: '16:9',
    },
  },
  button: {
    type: 'button',
    marginBottom: 'md',
    data: {
      label: 'Button',
      url: '/',
      variant: 'primary',
      alignment: 'left',
      openInNewTab: false,
    },
  },
};

// ============================================
// Block Labels (for UI)
// ============================================

export const blockLabels: Record<PageBlockType, { label: string; description: string }> = {
  hero: {
    label: 'Hero',
    description: 'Page header with title, subtitle, and metadata',
  },
  text: {
    label: 'Text',
    description: 'Rich text content block',
  },
  image: {
    label: 'Image',
    description: 'Single image with optional caption',
  },
  gallery: {
    label: 'Gallery',
    description: 'Grid of images with responsive columns',
  },
  divider: {
    label: 'Divider',
    description: 'Visual separator between sections',
  },
  quote: {
    label: 'Quote',
    description: 'Pull quote with attribution',
  },
  video: {
    label: 'Video',
    description: 'YouTube or Vimeo embed',
  },
  button: {
    label: 'Button',
    description: 'Call-to-action button link',
  },
};

// ============================================
// Helper Functions
// ============================================

export function createBlock(type: PageBlockType): PageBlock {
  const defaults = blockDefaults[type];
  return {
    ...defaults,
    id: generateBlockId(),
  } as PageBlock;
}

export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Extract video ID from YouTube or Vimeo URL
 */
export function parseVideoUrl(url: string): { provider: 'youtube' | 'vimeo' | null; id: string | null } {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { provider: 'youtube', id: match[1] };
    }
  }
  
  // Vimeo patterns
  const vimeoPattern = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoPattern);
  if (vimeoMatch) {
    return { provider: 'vimeo', id: vimeoMatch[1] };
  }
  
  return { provider: null, id: null };
}

