"use client";

import Link from "next/link";
import type { PageButtonBlock } from "@/lib/cms/page-blocks";
import { Button } from "@/components/ui/button";

interface ButtonBlockComponentProps {
  block: PageButtonBlock;
  isMobile?: boolean;
}

export function ButtonBlockComponent({ block }: ButtonBlockComponentProps) {
  const { label, url, variant, alignment = 'left', openInNewTab } = block.data;

  const alignmentClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[alignment];

  const buttonVariant = variant === 'primary' ? 'default' : variant;

  const linkProps = openInNewTab
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <div className={`flex ${alignmentClass}`}>
      <Button asChild variant={buttonVariant} size="lg">
        <Link href={url} {...linkProps}>
          {label}
        </Link>
      </Button>
    </div>
  );
}

