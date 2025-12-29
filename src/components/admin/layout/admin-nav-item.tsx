"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * AdminNavItem Component
 * 
 * Navigation item for the admin sidebar.
 * Matches Figma design with:
 * - 36px height
 * - 16px horizontal padding, 8px vertical
 * - 8px gap between icon and text
 * - 6px border radius
 * - Active: black bg, white text (inverted in dark mode)
 * - Inactive: transparent bg, black text, hover bg
 */

export interface AdminNavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function AdminNavItem({
  href,
  icon: Icon,
  label,
  active = false,
  onClick,
}: AdminNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        // Base styles
        "flex items-center gap-2 h-9 px-4 py-2 rounded-md",
        "text-sm font-medium transition-colors",
        "w-full",
        
        // Active state
        active && [
          "bg-zinc-900 text-white",
          "dark:bg-zinc-100 dark:text-zinc-900",
        ],
        
        // Inactive state
        !active && [
          "text-foreground",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        ]
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}



