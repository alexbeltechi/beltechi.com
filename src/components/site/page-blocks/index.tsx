"use client";

import { spacingScale, type SpacingKey } from "@/lib/design-tokens";
import type { PageBlock } from "@/lib/cms/page-blocks";
import { HeroBlockComponent } from "./hero-block";
import { TextBlockComponent } from "./text-block";
import { ImageBlockComponent } from "./image-block";
import { GalleryBlockComponent } from "./gallery-block";
import { DividerBlockComponent } from "./divider-block";
import { QuoteBlockComponent } from "./quote-block";
import { VideoBlockComponent } from "./video-block";
import { ButtonBlockComponent } from "./button-block";

// ============================================
// Block Component Map
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const blockComponents: Record<string, React.ComponentType<{ block: any; isMobile?: boolean }>> = {
  hero: HeroBlockComponent,
  text: TextBlockComponent,
  image: ImageBlockComponent,
  gallery: GalleryBlockComponent,
  divider: DividerBlockComponent,
  quote: QuoteBlockComponent,
  video: VideoBlockComponent,
  button: ButtonBlockComponent,
};

// ============================================
// Block Wrapper (handles spacing)
// ============================================

interface BlockWrapperProps {
  block: PageBlock;
  isMobile?: boolean;
  children: React.ReactNode;
}

function BlockWrapper({ block, isMobile, children }: BlockWrapperProps) {
  // Get spacing values, with mobile overrides if applicable
  const marginTop = isMobile && block.mobile?.marginTop 
    ? block.mobile.marginTop 
    : block.marginTop;
  const marginBottom = isMobile && block.mobile?.marginBottom 
    ? block.mobile.marginBottom 
    : block.marginBottom;

  const style: React.CSSProperties = {
    marginTop: marginTop ? spacingScale[marginTop as SpacingKey] : undefined,
    marginBottom: marginBottom ? spacingScale[marginBottom as SpacingKey] : undefined,
  };

  return (
    <div style={style} data-block-id={block.id} data-block-type={block.type}>
      {children}
    </div>
  );
}

// ============================================
// Page Block Renderer
// ============================================

interface PageBlockRendererProps {
  blocks: PageBlock[];
  isMobile?: boolean;
}

export function PageBlockRenderer({ blocks, isMobile = false }: PageBlockRendererProps) {
  return (
    <div className="page-blocks">
      {blocks.map((block) => {
        const Component = blockComponents[block.type];
        
        if (!Component) {
          console.warn(`Unknown block type: ${block.type}`);
          return null;
        }

        return (
          <BlockWrapper key={block.id} block={block} isMobile={isMobile}>
            <Component block={block} isMobile={isMobile} />
          </BlockWrapper>
        );
      })}
    </div>
  );
}

// Re-export individual components
export { HeroBlockComponent } from "./hero-block";
export { TextBlockComponent } from "./text-block";
export { ImageBlockComponent } from "./image-block";
export { GalleryBlockComponent } from "./gallery-block";
export { DividerBlockComponent } from "./divider-block";
export { QuoteBlockComponent } from "./quote-block";
export { VideoBlockComponent } from "./video-block";
export { ButtonBlockComponent } from "./button-block";

