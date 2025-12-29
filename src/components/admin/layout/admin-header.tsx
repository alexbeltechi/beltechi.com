"use client";

import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * AdminHeader Component
 * 
 * Mobile header for admin panel.
 * Shows on screens < lg breakpoint.
 * Contains: Admin title, theme toggle, menu button
 */

interface AdminHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function AdminHeader({ sidebarOpen, onToggleSidebar }: AdminHeaderProps) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b z-50 flex items-center justify-between px-4">
      {/* Title */}
      <span className="text-xl font-medium">Admin</span>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-9 w-9"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}



