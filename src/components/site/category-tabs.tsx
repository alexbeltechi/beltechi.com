"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  label: string;
}

interface CategoryTabsProps {
  categories: Category[];
}

export function CategoryTabs({ categories }: CategoryTabsProps) {
  const pathname = usePathname();
  const activeSlug = pathname === "/" ? "all" : pathname.slice(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categories]);

  // Get active category slug for "See all" link
  const seeAllHref = activeSlug === "all" ? "/portfolio" : `/${activeSlug}`;

  return (
    <div className="bg-white dark:bg-zinc-950 relative">
      {/* Left fade indicator */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
      )}
      
      {/* Right fade indicator - adjusted to not overlap See all button */}
      {canScrollRight && (
        <div className="absolute right-[100px] top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
      )}

      <div className="flex items-center justify-between h-[56px] px-4">
        <nav
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center justify-start gap-3 overflow-x-auto scrollbar-hide font-[family-name:var(--font-syne)] flex-1"
        >
          <Link
            href="/"
            className={cn(
              "whitespace-nowrap transition-colors shrink-0 text-[26px] tracking-tight",
              activeSlug === "all"
                ? "font-[800] text-black dark:text-white"
                : "font-medium text-zinc-400 dark:text-zinc-500"
            )}
          >
            All
          </Link>

          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${category.slug}`}
              className={cn(
                "whitespace-nowrap transition-colors shrink-0 text-[26px] tracking-tight",
                activeSlug === category.slug
                  ? "font-[800] text-black dark:text-white"
                  : "font-medium text-zinc-400 dark:text-zinc-500"
              )}
            >
              {category.label}
            </Link>
          ))}
        </nav>

        {/* See all link with chevron */}
        <Button
          variant="ghost"
          asChild
          className="shrink-0 ml-4 h-auto py-1 px-2 gap-0.5 hover:bg-transparent"
        >
          <Link href={seeAllHref}>
            <span className="font-[family-name:var(--font-syne)] font-bold text-[15px] text-black dark:text-white">
              See all
            </span>
            <ChevronRight className="size-4 text-black dark:text-white" />
          </Link>
        </Button>
      </div>
    </div>
  );
}






