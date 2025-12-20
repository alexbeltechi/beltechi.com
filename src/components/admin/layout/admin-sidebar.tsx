"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Tag,
  Image,
  Settings,
  History,
  PanelLeft,
  User,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AdminNavItem } from "./admin-nav-item";

/**
 * AdminSidebar Component
 * 
 * Main admin sidebar matching Figma design.
 * - 300px width on desktop
 * - Collapsible on mobile
 * - Navigation: Posts, Categories, Media, Settings, Activity
 */

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function AdminSidebar({ open, onClose, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  // Navigation items configuration
  const navItems = [
    {
      href: "/admin/content",
      icon: FileText,
      label: "Posts",
      active: pathname.startsWith("/admin/content"),
    },
    {
      href: "/admin/categories",
      icon: Tag,
      label: "Categories",
      active: pathname === "/admin/categories",
    },
    {
      href: "/admin/media",
      icon: Image,
      label: "Media",
      active: pathname === "/admin/media",
    },
    {
      href: "/admin/settings",
      icon: Settings,
      label: "Settings",
      active: pathname === "/admin/settings",
    },
    {
      href: "/admin/activity",
      icon: History,
      label: "Activity",
      active: pathname === "/admin/activity",
    },
  ];

  return (
    <aside
      className={cn(
        // Base styles
        "fixed left-0 top-0 bottom-0 z-50",
        "w-[300px] border-r bg-background",
        "flex flex-col",
        
        // Mobile: slide in/out
        "transform transition-transform duration-200",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Header - Desktop only (mobile uses AdminHeader) */}
      <div className="h-14 hidden lg:flex items-center justify-between px-4 border-b shrink-0">
        {/* Title */}
        <Link 
          href="/admin/content" 
          className="text-xl font-medium"
        >
          Admin
        </Link>
        
        {/* Header actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-9 w-9"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile spacer - push content below fixed AdminHeader */}
      <div className="h-14 lg:hidden shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <AdminNavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={item.active}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Footer - User section */}
      <div className="border-t px-3 h-14 flex items-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-2 px-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">Admin</p>
                <p className="text-xs text-muted-foreground truncate">
                  Development Mode
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                View Site
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

