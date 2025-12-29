import Link from "next/link";
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
  return (
    <div className="bg-white dark:bg-zinc-950 relative">
      <div className="flex items-center justify-between h-[56px] px-4">
        <span className="font-normal text-[15px] text-black dark:text-white">
          Recent
        </span>

        {/* See all link with chevron - goes to Portfolio page */}
        <Button
          variant="ghost"
          asChild
          className="shrink-0 ml-4 h-auto py-1 px-2 gap-0.5 hover:bg-transparent"
        >
          <Link href="/portfolio">
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






