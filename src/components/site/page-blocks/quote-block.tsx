"use client";

import type { PageQuoteBlock } from "@/lib/cms/page-blocks";

interface QuoteBlockComponentProps {
  block: PageQuoteBlock;
  isMobile?: boolean;
}

export function QuoteBlockComponent({ block }: QuoteBlockComponentProps) {
  const { text, attribution, alignment = 'left' } = block.data;

  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment];

  return (
    <blockquote className={`${alignmentClass}`}>
      <p className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-medium text-foreground leading-snug">
        &ldquo;{text}&rdquo;
      </p>
      {attribution && (
        <footer className="mt-4 text-sm text-muted-foreground">
          — {attribution}
        </footer>
      )}
    </blockquote>
  );
}

