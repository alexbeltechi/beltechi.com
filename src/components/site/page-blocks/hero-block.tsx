"use client";

import type { HeroBlock } from "@/lib/cms/page-blocks";

interface HeroBlockComponentProps {
  block: HeroBlock;
  isMobile?: boolean;
}

export function HeroBlockComponent({ block }: HeroBlockComponentProps) {
  const { title, subtitle, date, alignment = 'left' } = block.data;

  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment];

  return (
    <header className={`${alignmentClass}`}>
      <h1 className="font-[family-name:var(--font-syne)] font-semibold text-4xl md:text-5xl lg:text-6xl tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl">
          {subtitle}
        </p>
      )}
      {date && (
        <time className="mt-4 block text-sm text-muted-foreground">
          {new Date(date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </time>
      )}
    </header>
  );
}

