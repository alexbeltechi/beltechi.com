import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Pill Component
 * 
 * Universal pill/badge component for counts, types, statuses, and categories.
 * Use this instead of shadcn Badge for consistent styling across the app.
 * 
 * Variants:
 * - neutral: Counts, types (Post/Article), categories
 * - draft: Draft status (orange)
 * - published: Published status (green)
 * - archived: Archived status (gray)
 * 
 * @example
 * <Pill>16</Pill>
 * <Pill variant="neutral">Post</Pill>
 * <Pill variant="published">Published</Pill>
 */

const pillVariants = cva(
  // Base styles shared by ALL pills
  [
    "inline-flex items-center justify-center",
    "h-5 px-1.5",
    "rounded-full",
    "text-sm font-normal tracking-wide",
    "whitespace-nowrap",
    "transition-colors",
  ],
  {
    variants: {
      variant: {
        // Neutral - for counts, types, categories
        neutral: [
          "bg-zinc-100 text-zinc-900",
          "dark:bg-zinc-800 dark:text-zinc-100",
        ],

        // Status: Draft (orange)
        draft: [
          "bg-orange-100 text-orange-700",
          "dark:bg-orange-950/50 dark:text-orange-400",
        ],

        // Status: Published (green)
        published: [
          "bg-green-100 text-green-600",
          "dark:bg-green-950/50 dark:text-green-400",
        ],

        // Status: Archived (muted gray)
        archived: [
          "bg-zinc-100 text-zinc-500",
          "dark:bg-zinc-800 dark:text-zinc-400",
        ],

        // Info (blue) - for new items, notifications
        info: [
          "bg-blue-100 text-blue-700",
          "dark:bg-blue-950/50 dark:text-blue-400",
        ],

        // Warning (amber) - for attention items
        warning: [
          "bg-amber-100 text-amber-700",
          "dark:bg-amber-950/50 dark:text-amber-400",
        ],
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

/**
 * Base Pill component - use for any pill/badge styling
 */
export function Pill({ className, variant, ...props }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(pillVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * CountPill - specifically for numeric counts
 * @example <CountPill count={16} />
 */
export function CountPill({ 
  count, 
  className 
}: { 
  count: number; 
  className?: string;
}) {
  return (
    <Pill variant="neutral" className={className}>
      {count}
    </Pill>
  );
}

/**
 * TypePill - for content types (Post, Article, etc.)
 * @example <TypePill type="post" />
 */
export function TypePill({ 
  type, 
  className 
}: { 
  type: string; 
  className?: string;
}) {
  // Capitalize first letter
  const label = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  
  // Use light blue background for articles
  const isArticle = type.toLowerCase() === "article";
  
  return (
    <Pill 
      variant="neutral" 
      className={cn(
        isArticle && "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
        className
      )}
    >
      {label}
    </Pill>
  );
}

/**
 * StatusPill - for content status (Draft, Published, Archived)
 * @example <StatusPill status="published" />
 */
export function StatusPill({ 
  status, 
  className 
}: { 
  status: "draft" | "published" | "archived" | string; 
  className?: string;
}) {
  // Map status to variant
  const variant = 
    status === "published" ? "published" : 
    status === "draft" ? "draft" : 
    status === "archived" ? "archived" : 
    "neutral";
  
  // Capitalize first letter
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  
  return (
    <Pill variant={variant} className={className}>
      {label}
    </Pill>
  );
}

/**
 * CategoryPill - for category tags
 * @example <CategoryPill name="Photography" />
 */
export function CategoryPill({ 
  name, 
  className 
}: { 
  name: string; 
  className?: string;
}) {
  return (
    <Pill variant="neutral" className={className}>
      {name}
    </Pill>
  );
}

/**
 * IndexPill - for position/index indicators on media thumbnails
 * Zinc-600 background with white text, rounded rectangle, Inter font
 * Specs: h-20px, px-6px, pt-1px, rounded-md
 * @example <IndexPill index={1} /> // Shows "1"
 */
export function IndexPill({ 
  index, 
  className 
}: { 
  index: number; 
  className?: string;
}) {
  return (
    <span
      data-slot="index-pill"
      className={cn(
        "inline-flex items-center justify-center",
        "h-5 min-w-[26px] px-1.5 my-0",
        "rounded-md",
        "bg-zinc-600 text-white",
        "text-[13px] font-normal leading-none",
        className
      )}
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {index}
    </span>
  );
}

export { pillVariants };

