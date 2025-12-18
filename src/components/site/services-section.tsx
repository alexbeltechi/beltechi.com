import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export function ServicesSection() {
  return (
    <section className="flex flex-col gap-6 items-start justify-center px-4 py-16">
      {/* 
        Recommended word counts per breakpoint for visual balance:
        - Mobile (< 640px): ~20-25 words
        - Tablet (640px-1024px): ~30-35 words
        - Desktop (> 1024px): ~40-50 words
        
        The current text is ~42 words which works well across all breakpoints.
        For longer text, consider:
        - 60-70 words for ultra-wide displays (>1440px)
        - Keep sentences flowing naturally without forced line breaks
      */}
      <p className="font-[family-name:var(--font-syne)] font-medium text-[28px] sm:text-[36px] md:text-[42px] lg:text-[48px] leading-[1.2] text-black dark:text-white">
        I collaborate with founders, creators, and digital businesses to refine ideas, design standout products and brands, and build high-performing digital experiences—from concept to launch and growth.
      </p>
      <Button
        asChild
        className="bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-full h-10 pl-5 pr-3 gap-0.5"
      >
        <Link href="/services">
          <span className="font-[family-name:var(--font-syne)] font-medium text-[15px]">
            Services
          </span>
          <ChevronRight className="size-5" />
        </Link>
      </Button>
    </section>
  );
}
