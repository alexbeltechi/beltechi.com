"use client";

import type { PageDividerBlock } from "@/lib/cms/page-blocks";
import { spacingScale } from "@/lib/design-tokens";

interface DividerBlockComponentProps {
  block: PageDividerBlock;
  isMobile?: boolean;
}

export function DividerBlockComponent({ block }: DividerBlockComponentProps) {
  const { style, spacing } = block.data;

  const spacingValue = spacing ? spacingScale[spacing] : undefined;

  if (style === 'space') {
    return <div style={{ height: spacingValue || '2rem' }} />;
  }

  if (style === 'dots') {
    return (
      <div 
        className="flex items-center justify-center gap-2"
        style={{ paddingTop: spacingValue, paddingBottom: spacingValue }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
      </div>
    );
  }

  if (style === 'dashed') {
    return (
      <hr 
        className="border-t-2 border-dashed border-muted-foreground/20"
        style={{ marginTop: spacingValue, marginBottom: spacingValue }}
      />
    );
  }

  // Default: line
  return (
    <hr 
      className="border-t border-muted-foreground/20"
      style={{ marginTop: spacingValue, marginBottom: spacingValue }}
    />
  );
}

