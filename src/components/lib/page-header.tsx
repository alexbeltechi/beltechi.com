import * as React from "react";
import { cn } from "@/lib/utils";
import { IndexPill } from "./pill";

/**
 * PageHeader Component
 * 
 * Universal page header with title, optional count badge, and action area.
 * Use for consistent page headers across admin and site.
 * 
 * @example
 * <PageHeader title="Posts" count={16}>
 *   <Button>Create Post</Button>
 * </PageHeader>
 */

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title */
  title: string;
  /** Optional count to display as pill */
  count?: number;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Action buttons (renders on the right) */
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  count,
  subtitle,
  children,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 w-full",
        className
      )}
      {...props}
    >
      {/* Title area */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight truncate">
            {title}
          </h1>
          {count !== undefined && <IndexPill index={count} />}
        </div>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
        )}
      </div>

      {/* Actions area */}
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  );
}

/**
 * PageHeaderNav Component
 * 
 * Secondary row for page-level navigation/filters.
 * Typically contains tabs, search, filters.
 * 
 * @example
 * <PageHeaderNav>
 *   <Tabs />
 *   <Filters />
 * </PageHeaderNav>
 */
export function PageHeaderNav({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

