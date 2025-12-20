import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="flex items-center justify-center px-4 py-[120px]">
      <div className="flex flex-col items-center justify-center gap-4 max-w-[600px] text-center">
        <h1 className="font-[family-name:var(--font-syne)] font-medium text-[32px] sm:text-[40px] md:text-[48px] leading-[1.2] text-black dark:text-white">
          Start your beautiful business transformation
        </h1>
        <Button
          asChild
          className="bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-full h-10 pl-[18px] pr-3 gap-0.5"
        >
          <Link href="/contact">
            <span className="font-[family-name:var(--font-syne)] font-medium text-[15px]">
              Work together
            </span>
            <ChevronRight className="size-5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
