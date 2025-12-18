"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  categories: string[];
}

export function CategoryTabs({ categories }: CategoryTabsProps) {
  const pathname = usePathname();
  const activeSlug = pathname === "/" ? "all" : pathname.slice(1);

  return (
    <div className="sticky top-0 z-50 bg-white">
      <nav className="flex items-center gap-4 px-4 h-[56px] overflow-x-auto md:justify-center scrollbar-hide">
        <Link
          href="/"
          className={cn(
            "whitespace-nowrap transition-colors shrink-0",
            activeSlug === "all" ? "text-h1-extrabold" : "text-h1-medium"
          )}
        >
          All
        </Link>

        {categories.map((category) => (
          <Link
            key={category}
            href={`/${category.toLowerCase()}`}
            className={cn(
              "whitespace-nowrap transition-colors shrink-0",
              activeSlug === category.toLowerCase()
                ? "text-h1-extrabold"
                : "text-h1-medium"
            )}
          >
            {category}
          </Link>
        ))}
      </nav>
    </div>
  );
}






