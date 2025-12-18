"use client";

import { useState } from "react";
import { Syne } from "next/font/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Tag,
  Image,
  Settings,
  Menu,
  X,
  User,
  ExternalLink,
} from "lucide-react";
import { ThemeProvider } from "@/components/providers/theme-provider";
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

const syne = Syne({
  variable: "--font-admin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Don't render sidebar on login page
  if (pathname === "/admin/login") {
    return <div className={syne.variable}>{children}</div>;
  }

  return (
    <div
      className={cn(syne.variable, "min-h-screen bg-background text-foreground")}
      style={{ fontFamily: "var(--font-admin), system-ui, sans-serif" }}
    >
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b z-50 flex items-center justify-between px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm font-extrabold tracking-wide">
            BELTECHI
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
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

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 border-r bg-background z-50 transform transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:block"
        )}
      >
        {/* Logo - hidden on mobile (shown in header) */}
        <div className="h-14 hidden lg:flex items-center justify-between px-4 border-b">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-extrabold tracking-wide">
              BELTECHI
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Mobile spacer */}
        <div className="h-14 lg:hidden" />

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          <NavItem
            href="/admin"
            icon={LayoutDashboard}
            label="Dashboard"
            active={pathname === "/admin"}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            href="/admin/content"
            icon={FileText}
            label="Posts"
            active={pathname.startsWith("/admin/content")}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            href="/admin/categories"
            icon={Tag}
            label="Categories"
            active={pathname === "/admin/categories"}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            href="/admin/media"
            icon={Image}
            label="Media"
            active={pathname === "/admin/media"}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            href="/admin/settings"
            icon={Settings}
            label="Settings"
            active={pathname === "/admin/settings"}
            onClick={() => setSidebarOpen(false)}
          />
        </nav>

        {/* Bottom section - User & View Site */}
        <div className="absolute bottom-0 left-0 right-0 border-t">
          <div className="p-3">
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {/* Mobile top padding */}
        <div className="h-14 lg:hidden" />
        <div className="min-h-screen p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </ThemeProvider>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
