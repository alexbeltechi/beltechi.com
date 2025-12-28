/**
 * Component Library
 * 
 * Custom design system primitives built on top of shadcn/ui.
 * Use these components for consistent styling across the app.
 * 
 * Import from this file:
 * import { Pill, StatusPill, ListRow, PageHeader } from "@/components/lib";
 */

// Pill components - for badges, counts, statuses
export {
  Pill,
  pillVariants,
  CountPill,
  TypePill,
  StatusPill,
  CategoryPill,
  IndexPill,
  type PillProps,
} from "./pill";

// ListRow components - for clickable list items
export {
  ListRow,
  ListRowContent,
  ListRowActions,
  ListRowThumbnail,
  ListRowCheckbox,
  type ListRowProps,
} from "./list-row";

// PageHeader components - for page titles and navigation
export {
  PageHeader,
  PageHeaderNav,
  type PageHeaderProps,
} from "./page-header";



