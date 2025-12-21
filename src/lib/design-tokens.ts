/**
 * Design Tokens
 * 
 * Centralized design system values used across the CMS.
 * These tokens ensure consistency between admin and frontend.
 */

// ============================================
// Spacing Scale
// ============================================

export const spacingScale = {
  none: '0',
  xs: '0.5rem',   // 8px
  sm: '1rem',     // 16px
  md: '2rem',     // 32px
  lg: '4rem',     // 64px
  xl: '6rem',     // 96px
  '2xl': '8rem',  // 128px
} as const;

export type SpacingKey = keyof typeof spacingScale;

export const spacingOptions: { value: SpacingKey; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'xs', label: 'Extra Small (8px)' },
  { value: 'sm', label: 'Small (16px)' },
  { value: 'md', label: 'Medium (32px)' },
  { value: 'lg', label: 'Large (64px)' },
  { value: 'xl', label: 'Extra Large (96px)' },
  { value: '2xl', label: '2X Large (128px)' },
];

// ============================================
// Column Layouts
// ============================================

export const columnOptions = [1, 2, 3, 4] as const;
export type ColumnCount = typeof columnOptions[number];

// ============================================
// Width Options
// ============================================

export const widthScale = {
  narrow: '48rem',    // 768px
  default: '64rem',   // 1024px
  wide: '80rem',      // 1280px
  full: '100%',
} as const;

export type WidthKey = keyof typeof widthScale;

export const widthOptions: { value: WidthKey; label: string }[] = [
  { value: 'narrow', label: 'Narrow (768px)' },
  { value: 'default', label: 'Default (1024px)' },
  { value: 'wide', label: 'Wide (1280px)' },
  { value: 'full', label: 'Full Width' },
];

// ============================================
// Aspect Ratios
// ============================================

export const aspectRatios = {
  auto: 'auto',
  '1:1': '1 / 1',
  '4:3': '4 / 3',
  '3:2': '3 / 2',
  '16:9': '16 / 9',
  '21:9': '21 / 9',
} as const;

export type AspectRatioKey = keyof typeof aspectRatios;

export const aspectRatioOptions: { value: AspectRatioKey; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1:1', label: 'Square (1:1)' },
  { value: '4:3', label: 'Standard (4:3)' },
  { value: '3:2', label: 'Photo (3:2)' },
  { value: '16:9', label: 'Widescreen (16:9)' },
  { value: '21:9', label: 'Cinematic (21:9)' },
];

// ============================================
// Button Variants
// ============================================

export const buttonVariants = ['primary', 'secondary', 'outline', 'ghost'] as const;
export type ButtonVariant = typeof buttonVariants[number];

export const buttonVariantOptions: { value: ButtonVariant; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
];

// ============================================
// Divider Styles
// ============================================

export const dividerStyles = ['line', 'dashed', 'dots', 'space'] as const;
export type DividerStyle = typeof dividerStyles[number];

export const dividerStyleOptions: { value: DividerStyle; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dots', label: 'Dots' },
  { value: 'space', label: 'Space Only' },
];

// ============================================
// Text Alignment
// ============================================

export const textAlignments = ['left', 'center', 'right'] as const;
export type TextAlignment = typeof textAlignments[number];

export const textAlignmentOptions: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

