import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * ListRow Component
 * 
 * Universal clickable row for lists. Replaces Card-based list items
 * with a cleaner border-bottom style.
 * 
 * Features:
 * - Hover state (zinc-100/zinc-800)
 * - Border bottom divider
 * - Supports href (navigates on click) or onClick
 * - Click on interactive children (checkbox, buttons) won't trigger navigation
 * - Flexible content via children
 * 
 * @example
 * <ListRow href="/admin/posts/123">
 *   <Thumbnail />
 *   <Content />
 *   <Actions />
 * </ListRow>
 */

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Navigate to this URL on click */
  href?: string;
  /** Click handler (used when no href) */
  onClick?: () => void;
  /** Disable hover/click interactions */
  disabled?: boolean;
  /** Show selected state */
  selected?: boolean;
  /** Remove bottom border (for last item) */
  noBorder?: boolean;
}

export function ListRow({
  children,
  href,
  onClick,
  disabled = false,
  selected = false,
  noBorder = false,
  className,
  ...props
}: ListRowProps) {
  const router = useRouter();

  const baseStyles = cn(
    // Layout
    "flex items-center gap-3",
    "px-2 py-3",
    
    // Border
    !noBorder && "border-b border-zinc-200 dark:border-zinc-800",
    
    // Interactive states
    !disabled && [
      "cursor-pointer",
      "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
      "transition-colors",
    ],
    
    // Disabled state
    disabled && "opacity-50 cursor-not-allowed",
    
    // Selected state - no visual change, checkbox shows selection
    // (intentionally empty - selection indicated by checkbox only)
    
    className
  );

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    const isInteractive = 
      target.closest('button') || 
      target.closest('input') || 
      target.closest('[role="checkbox"]') ||
      target.closest('[data-slot="checkbox"]') ||
      target.closest('[data-radix-collection-item]');
    
    if (isInteractive) {
      return;
    }

    if (disabled) return;

    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <div
      role="button"
      tabIndex={!disabled ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={
        !disabled
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (onClick) {
                  onClick();
                } else if (href) {
                  router.push(href);
                }
              }
            }
          : undefined
      }
      className={baseStyles}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ListRowContent - Main content area of a row
 * Fills available space and truncates overflow
 */
export function ListRowContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 min-w-0", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * ListRowActions - Actions area (end of row)
 * Prevents click propagation for interactive elements
 */
export function ListRowActions({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shrink-0 flex items-center gap-2", className)}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ListRowThumbnail - Thumbnail/avatar area
 */
export function ListRowThumbnail({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("shrink-0", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * ListRowCheckbox - Checkbox area (for selection)
 * Stops propagation to prevent row click/navigation
 */
export function ListRowCheckbox({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shrink-0 flex items-center justify-center w-8", className)}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}
