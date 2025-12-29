"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  
  // Check if we're on an article page
  const isArticlePage = pathname?.startsWith("/article/");

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={isArticlePage ? "bg-white dark:bg-zinc-950" : "sticky top-0 z-50 bg-white dark:bg-zinc-950"}>
        <nav className="flex items-center justify-between px-4 py-3 h-[56px]">
          {/* Logo - Left */}
          <Link href="/" className="text-h1-extrabold text-black dark:text-white shrink-0" onClick={closeMenu}>
            BELTECHI
          </Link>

          {/* Center Nav - Desktop */}
          <div className="hidden items-center gap-6 md:flex absolute left-1/2 -translate-x-1/2">
            <Link
              href="/"
              className="text-[15px] font-bold text-black dark:text-white transition-opacity hover:opacity-70"
            >
              Portfolio
            </Link>
            <Link
              href="/services"
              className="text-[15px] font-bold text-black dark:text-white transition-opacity hover:opacity-70"
            >
              Services
            </Link>
            <Link
              href="/about"
              className="text-[15px] font-bold text-black dark:text-white transition-opacity hover:opacity-70"
            >
              About
            </Link>
          </div>

          {/* Right Actions - Desktop */}
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <Button className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 rounded-full px-4 h-9">
              Work with me
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="text-body-bold text-black dark:text-white md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </button>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950 md:hidden">
          <div className="flex items-center justify-between px-4 h-[56px]">
            <Link href="/" className="text-h1-extrabold text-black dark:text-white" onClick={closeMenu}>
              BELTECHI
            </Link>
            <button onClick={closeMenu} className="p-2" aria-label="Close menu">
              <X className="size-6 text-black dark:text-white" strokeWidth={2} />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 h-[calc(100vh-56px)]">
            <Link
              href="/"
              className="text-[15px] font-bold text-black dark:text-white transition-opacity hover:opacity-70"
              onClick={closeMenu}
            >
              Portfolio
            </Link>
            <Link
              href="/services"
              className="text-[15px] font-bold text-black dark:text-white transition-opacity hover:opacity-70"
              onClick={closeMenu}
            >
              Services
            </Link>
            <Link
              href="/about"
              className="text-[15px] font-bold text-black dark:text-white transition-opacity hover:opacity-70"
              onClick={closeMenu}
            >
              About
            </Link>
            <Button className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 rounded-full px-6 mt-4">
              Work with me
            </Button>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  );
}






