"use client";

import type { PageBlock } from "@/lib/cms/page-blocks";
import { spacingScale } from "@/lib/design-tokens";

interface BlockPreviewProps {
  block: PageBlock;
  isMobile?: boolean;
}

export function BlockPreview({ block, isMobile }: BlockPreviewProps) {
  switch (block.type) {
    case "hero":
      return <HeroPreview block={block} />;
    case "text":
      return <TextPreview block={block} />;
    case "image":
      return <ImagePreview block={block} />;
    case "gallery":
      return <GalleryPreview block={block} isMobile={isMobile} />;
    case "divider":
      return <DividerPreview block={block} />;
    case "quote":
      return <QuotePreview block={block} />;
    case "video":
      return <VideoPreview block={block} />;
    case "button":
      return <ButtonPreview block={block} />;
    default:
      return (
        <div className="p-4 bg-muted rounded text-muted-foreground text-sm">
          Unknown block type
        </div>
      );
  }
}

// Individual block previews

function HeroPreview({ block }: { block: Extract<PageBlock, { type: "hero" }> }) {
  const { title, subtitle, date, alignment = "left" } = block.data;
  const alignClass = alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left";
  
  return (
    <div className={alignClass}>
      <h1 className="text-2xl font-bold">{title || "Page Title"}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      {date && <p className="mt-2 text-sm text-muted-foreground">{date}</p>}
    </div>
  );
}

function TextPreview({ block }: { block: Extract<PageBlock, { type: "text" }> }) {
  const { content, alignment = "left" } = block.data;
  const alignClass = alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left";
  
  const preview = content?.slice(0, 200) || "Lorem ipsum dolor sit amet...";
  
  return (
    <div className={`${alignClass} text-sm`}>
      <p className="text-muted-foreground line-clamp-4">{preview}</p>
    </div>
  );
}

function ImagePreview({ block }: { block: Extract<PageBlock, { type: "image" }> }) {
  const { mediaId, caption } = block.data;
  
  return (
    <div>
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        {mediaId ? (
          <span className="text-sm text-muted-foreground">Image: {mediaId.slice(0, 8)}...</span>
        ) : (
          <span className="text-sm text-muted-foreground">No image selected</span>
        )}
      </div>
      {caption && <p className="mt-2 text-sm text-muted-foreground text-center">{caption}</p>}
    </div>
  );
}

function GalleryPreview({ block, isMobile }: { block: Extract<PageBlock, { type: "gallery" }>; isMobile?: boolean }) {
  const { mediaIds, columns, gap } = block.data;
  const mobileColumns = block.mobile?.columns;
  const effectiveColumns = isMobile && mobileColumns ? mobileColumns : columns;
  
  const items = mediaIds.length > 0 ? mediaIds : [1, 2, 3, 4, 5, 6];
  
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
        gap: spacingScale[gap] || "1rem",
      }}
    >
      {items.slice(0, 6).map((item, i) => (
        <div key={i} className="aspect-square bg-muted rounded-lg" />
      ))}
    </div>
  );
}

function DividerPreview({ block }: { block: Extract<PageBlock, { type: "divider" }> }) {
  const { style } = block.data;
  
  if (style === "space") {
    return <div className="h-8" />;
  }
  if (style === "dots") {
    return (
      <div className="flex justify-center gap-2 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
      </div>
    );
  }
  if (style === "dashed") {
    return <hr className="border-t-2 border-dashed border-muted-foreground/20" />;
  }
  return <hr className="border-t border-muted-foreground/20" />;
}

function QuotePreview({ block }: { block: Extract<PageBlock, { type: "quote" }> }) {
  const { text, attribution, alignment = "left" } = block.data;
  const alignClass = alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left";
  
  return (
    <blockquote className={`${alignClass} border-l-4 border-muted-foreground/30 pl-4`}>
      <p className="text-lg italic">&ldquo;{text || "Quote text..."}&rdquo;</p>
      {attribution && <footer className="mt-2 text-sm text-muted-foreground">— {attribution}</footer>}
    </blockquote>
  );
}

function VideoPreview({ block }: { block: Extract<PageBlock, { type: "video" }> }) {
  const { url, caption } = block.data;
  
  return (
    <div>
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
        <span className="text-white/60 text-sm">
          {url ? "Video embed" : "Paste YouTube or Vimeo URL"}
        </span>
      </div>
      {caption && <p className="mt-2 text-sm text-muted-foreground text-center">{caption}</p>}
    </div>
  );
}

function ButtonPreview({ block }: { block: Extract<PageBlock, { type: "button" }> }) {
  const { label, variant, alignment = "left" } = block.data;
  const alignClass = alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : "justify-start";
  
  const variantClass = {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-input bg-background",
    ghost: "hover:bg-accent",
  }[variant] || "bg-primary text-primary-foreground";
  
  return (
    <div className={`flex ${alignClass}`}>
      <span className={`px-4 py-2 rounded-md text-sm font-medium ${variantClass}`}>
        {label || "Button"}
      </span>
    </div>
  );
}

