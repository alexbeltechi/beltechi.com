// ============================================
// CMS Core Types
// ============================================

export type EntryStatus = "draft" | "published" | "archived";
export type EntryVisibility = "public" | "private";

export type FieldType =
  | "text"
  | "textarea"
  | "slug"
  | "date"
  | "datetime"
  | "boolean"
  | "number"
  | "select"
  | "categories"
  | "media"
  | "media:list"
  | "reference"
  | "reference:list"
  | "blocks"
  | "object"
  | "tags";

export type BlockType =
  | "text"
  | "image"
  | "gallery"
  | "video"
  | "youtube"
  | "quote"
  | "divider"
  | "code"
  | "embed"
  | "callout"
  | "list";

// ============================================
// Schema Types
// ============================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  key: string;
  type: FieldType;
  required: boolean;
  label: string;
  placeholder?: string;
  description?: string;
  // For select fields
  options?: SelectOption[];
  // For media fields
  accept?: string[];
  max?: number;
  // For blocks field
  blockTypes?: BlockType[];
  // For object fields (nested)
  fields?: FieldDefinition[];
  // For reference fields
  to?: string;
  // Default value
  defaultValue?: unknown;
}

export interface CollectionSchema {
  slug: string;
  name: string;
  description: string;
  fields: FieldDefinition[];
  admin: {
    titleField: string;
    subtitleField?: string;
    thumbnailField?: string;
    defaultSort: {
      field: string;
      direction: "asc" | "desc";
    };
  };
}

// ============================================
// SEO Types
// ============================================

export interface SEOData {
  title?: string;
  description?: string;
  image?: string; // OG image URL or media ID
  noIndex?: boolean;
  canonicalUrl?: string;
  keywords?: string[];
}

// ============================================
// Entry Types
// ============================================

export interface EntryBase<T = Record<string, unknown>> {
  id: string;
  collection: string;
  slug: string;
  status: EntryStatus;
  visibility: EntryVisibility;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  scheduledAt?: string | null; // Future publish date
  authorId: string | null;
  contributors?: string[]; // Co-author IDs (future multi-author)
  data: T;
  pendingData?: T; // Unpublished changes for published entries
  seo?: SEOData;
  metadata?: Record<string, unknown>; // Extensibility bucket
  external?: Record<string, unknown>; // For migrations/external references
}

export interface PostData {
  title?: string;
  description?: string;
  media: string[]; // Array of media IDs
  coverMediaId?: string; // Cover image for grids/previews
  categories: string[]; // Array of category IDs
  tags: string[]; // Array of tag strings
  date?: string;
  location?: string;
  [key: string]: unknown; // Allow additional fields
}

export interface ArticleData {
  title: string;
  excerpt?: string;
  featuredImage?: string; // Media ID
  content: Block[];
  categories: string[]; // Array of category IDs
  tags: string[]; // Array of tag strings
  date?: string;
  readingTime?: number; // Minutes (calculated)
  [key: string]: unknown; // Allow additional fields
}

export interface PostEntry extends EntryBase<PostData> {
  collection: "posts";
}

export interface ArticleEntry extends EntryBase<ArticleData> {
  collection: "articles";
}

export type Entry = PostEntry | ArticleEntry;

// ============================================
// Block Types
// ============================================

export interface TextBlock {
  type: "text";
  id: string;
  html: string;
}

export interface ImageBlock {
  type: "image";
  id: string;
  mediaId: string;
  caption?: string;
  alt?: string;
}

export interface GalleryBlock {
  type: "gallery";
  id: string;
  mediaIds: string[];
  layout?: "classic" | "grid" | "masonry" | "carousel";
  columns?: number;
  gap?: number;
  width?: "normal" | "large" | "full";
}

export interface VideoBlock {
  type: "video";
  id: string;
  mediaId: string;
  caption?: string;
}

export interface YouTubeBlock {
  type: "youtube";
  id: string;
  url: string;
  caption?: string;
}

export interface QuoteBlock {
  type: "quote";
  id: string;
  text: string;
  attribution?: string;
}

export interface DividerBlock {
  type: "divider";
  id: string;
  style?: "line" | "dots" | "space";
}

export interface CodeBlock {
  type: "code";
  id: string;
  code: string;
  language?: string;
  filename?: string;
}

export interface EmbedBlock {
  type: "embed";
  id: string;
  url: string;
  html?: string; // oEmbed HTML
  provider?: string;
}

export interface CalloutBlock {
  type: "callout";
  id: string;
  text: string;
  variant?: "info" | "warning" | "success" | "error";
  icon?: string;
}

export interface ListBlock {
  type: "list";
  id: string;
  items: string[];
  style: "bullet" | "numbered" | "checklist";
}

export type Block =
  | TextBlock
  | ImageBlock
  | GalleryBlock
  | VideoBlock
  | YouTubeBlock
  | QuoteBlock
  | DividerBlock
  | CodeBlock
  | EmbedBlock
  | CalloutBlock
  | ListBlock;

// ============================================
// Media Types
// ============================================

export interface ImageVariant {
  filename: string;
  path: string;
  url: string;
  width: number;
  height: number;
  size: number;
}

export interface MediaItem {
  id: string;

  // File identification
  filename: string; // Sanitized SEO-friendly filename (e.g., beach-sunset-x7k9.jpg)
  originalName: string; // Original upload name (e.g., "Beach Sunset (Final).JPG")
  slug: string; // URL-safe identifier

  // Primary file (optimized display version by default)
  path: string;
  url: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // For video/audio (seconds)

  // Original file info (optional - not stored to save costs)
  original?: {
    filename: string;
    path: string;
    url: string;
    width: number;
    height: number;
    size: number;
  };

  // Generated variants (for images only)
  variants?: {
    display?: ImageVariant; // 2400px - hero/lightbox
    large?: ImageVariant; // 1600px - default grid
    medium?: ImageVariant; // 1200px - thumbnails
    thumb?: ImageVariant; // 400px - admin/tiny
  };

  // Video poster/thumbnail (first frame extracted as JPG)
  poster?: {
    url: string;
    width: number;
    height: number;
  };

  // Active variant being served as primary URL
  activeVariant: "original" | "display" | "large" | "medium" | "thumb";

  // WordPress-compatible metadata
  title: string; // Display title
  alt: string; // Alt text for accessibility/SEO
  caption?: string; // Optional caption
  description?: string; // Longer description
  credit?: string; // Photographer/source attribution

  // Organization
  folderId?: string; // Folder/album organization (future)
  tags?: string[]; // Media tags for filtering

  // Attribution
  uploadedBy?: string; // User ID who uploaded

  // Dates
  createdAt: string;
  updatedAt?: string;

  // For migrations/external references
  externalIds?: {
    wordpress?: string;
    [key: string]: string | undefined;
  };

  // Hash for deduplication/integrity
  hash?: string;

  // Blur placeholder for instant loading (base64 data URL, ~20px wide)
  blurDataURL?: string;
}

export interface MediaIndex {
  items: MediaItem[];
}

// Image processing settings
export interface ImageProcessingSettings {
  variants: {
    display?: { maxEdge: number; quality: number };
    large?: { maxEdge: number; quality: number };
    medium?: { maxEdge: number; quality: number };
    thumb?: { maxEdge: number; quality: number };
  };
  defaultActiveVariant: "original" | "display" | "large" | "medium";
  generateWebP: boolean;
}

// ============================================
// User Types (Future Multi-Author)
// ============================================

export type UserRole = "owner" | "admin" | "editor" | "author" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  bio?: string;
  social?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// Role permissions (for future implementation)
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ["*"], // Everything
  admin: ["content:*", "media:*", "users:manage", "settings:*"],
  editor: ["content:*", "media:*"],
  author: ["content:own", "media:upload"],
  viewer: ["content:read"],
};

// ============================================
// Site Settings Types
// ============================================

export interface SiteSettings {
  name: string;
  tagline?: string;
  description?: string;
  logo?: string; // Media ID or URL
  favicon?: string;
  url?: string;
  social?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    github?: string;
    youtube?: string;
    tiktok?: string;
  };
  defaultSeo?: SEOData;
  features?: {
    comments?: boolean;
    search?: boolean;
    newsletter?: boolean;
    rss?: boolean;
  };
  analytics?: {
    googleAnalyticsId?: string;
    plausibleDomain?: string;
  };
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
