"use client";

import type { PageTextBlock } from "@/lib/cms/page-blocks";

interface TextBlockComponentProps {
  block: PageTextBlock;
  isMobile?: boolean;
}

export function TextBlockComponent({ block }: TextBlockComponentProps) {
  const { content, alignment = 'left' } = block.data;

  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment];

  // Split content by double newlines for paragraphs
  const paragraphs = content.split('\n\n').filter(Boolean);

  return (
    <div className={`prose prose-lg dark:prose-invert max-w-none ${alignmentClass}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-foreground/90 leading-relaxed">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

