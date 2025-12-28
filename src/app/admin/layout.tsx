"use client";

import { useState } from "react";
import { Syne, Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AdminSidebar, AdminHeader } from "@/components/admin/layout";
import { DatabaseErrorHandler } from "@/components/admin/database-error-handler";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const syne = Syne({
  variable: "--font-admin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Don't render sidebar on login page
  if (pathname === "/admin/login") {
    return <div className={cn(syne.variable, inter.variable)}>{children}</div>;
  }

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div
      className={cn(syne.variable, inter.variable, "min-h-screen bg-background text-foreground")}
      style={{ fontFamily: "var(--font-admin), system-ui, sans-serif" }}
    >
      {/* Mobile Header */}
      <AdminHeader 
        sidebarOpen={sidebarOpen} 
        onToggleSidebar={toggleSidebar} 
      />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar 
        open={sidebarOpen} 
        onClose={closeSidebar}
        onToggle={toggleSidebar}
      />

      {/* Main Content */}
      <main className="lg:ml-[300px]">
        {/* Mobile top padding */}
        <div className="h-14 lg:hidden" />
        <div className="min-h-screen">{children}</div>
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
      <DatabaseErrorHandler>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </DatabaseErrorHandler>
      <Toaster />
    </ThemeProvider>
  );
}
