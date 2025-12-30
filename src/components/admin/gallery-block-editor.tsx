"use client";

import { useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Image as ImageIcon,
  Plus,
  Upload,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GalleryBlock, MediaItem } from "@/lib/cms/types";

interface GalleryBlockEditorProps {
  block: GalleryBlock;
  galleryMedia: MediaItem[];
  onUpdate: (updates: Partial<GalleryBlock>) => void;
  onOpenGalleryPicker?: () => void;
  onReplaceImage?: (index: number) => void;
}

export function GalleryBlockEditor({
  block,
  galleryMedia,
  onUpdate,
  onOpenGalleryPicker,
  onReplaceImage,
}: GalleryBlockEditorProps) {
  // Move image left (decrease index)
  const moveImageLeft = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const newMediaIds = [...(block.mediaIds || [])];
      [newMediaIds[index], newMediaIds[index - 1]] = [
        newMediaIds[index - 1],
        newMediaIds[index],
      ];
      onUpdate({ mediaIds: newMediaIds });
    },
    [block.mediaIds, onUpdate]
  );

  // Move image right (increase index)
  const moveImageRight = useCallback(
    (index: number) => {
      const mediaIds = block.mediaIds || [];
      if (index >= mediaIds.length - 1) return;
      const newMediaIds = [...mediaIds];
      [newMediaIds[index], newMediaIds[index + 1]] = [
        newMediaIds[index + 1],
        newMediaIds[index],
      ];
      onUpdate({ mediaIds: newMediaIds });
    },
    [block.mediaIds, onUpdate]
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      const currentMediaIds = block.mediaIds || [];
      const newMediaIds = currentMediaIds.filter((_, i) => i !== index);
      onUpdate({ mediaIds: newMediaIds });
    },
    [block.mediaIds, onUpdate]
  );

  const handleReplaceImage = useCallback(
    (index: number) => {
      onReplaceImage?.(index);
    },
    [onReplaceImage]
  );

  // Render images in the selected layout pattern
  const renderLayoutPreview = () => {
    const layout = block.layout || "classic";

    if (layout === "grid") {
      const columns = block.columns || 3;
      return (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {galleryMedia.map((item, index) => (
            <ThumbnailItem
              key={item.id}
              item={item}
              index={index}
              total={galleryMedia.length}
              onMoveLeft={() => moveImageLeft(index)}
              onMoveRight={() => moveImageRight(index)}
              onRemove={() => handleRemoveImage(index)}
              onReplace={() => handleReplaceImage(index)}
            />
          ))}
        </div>
      );
    }

    // Classic layout preview - single images at full width, pairs side by side
    const rows: MediaItem[][] = [];
    let i = 0;
    const count = galleryMedia.length;

    if (count === 1) {
      rows.push([galleryMedia[0]]);
    } else if (count === 2) {
      rows.push([galleryMedia[0]]);
      rows.push([galleryMedia[1]]);
    } else {
      while (i < count) {
        const remaining = count - i;

        if (remaining === 1) {
          rows.push([galleryMedia[i]]);
          i++;
        } else if (remaining === 2) {
          rows.push([galleryMedia[i]]);
          rows.push([galleryMedia[i + 1]]);
          i += 2;
        } else {
          rows.push([galleryMedia[i]]);
          if (i + 2 < count) {
            rows.push([galleryMedia[i + 1], galleryMedia[i + 2]]);
            i += 3;
          } else {
            rows.push([galleryMedia[i + 1]]);
            rows.push([galleryMedia[i + 2]]);
            i += 3;
          }
        }
      }
    }

    return (
      <div className="flex flex-col gap-2">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={`grid gap-2 ${
              row.length === 1 ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            {row.map((item) => {
              const itemIndex = galleryMedia.findIndex((m) => m.id === item.id);
              return (
                <ThumbnailItem
                  key={item.id}
                  item={item}
                  index={itemIndex}
                  total={galleryMedia.length}
                  onMoveLeft={() => moveImageLeft(itemIndex)}
                  onMoveRight={() => moveImageRight(itemIndex)}
                  onRemove={() => handleRemoveImage(itemIndex)}
                  onReplace={() => handleReplaceImage(itemIndex)}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {galleryMedia && galleryMedia.length > 0 ? (
        <div className="space-y-4">
          {/* Image grid with layout preview */}
          {renderLayoutPreview()}

          {/* Layout selector */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
              Layout
            </label>
            <Select
              value={block.layout || "classic"}
              onValueChange={(value) =>
                onUpdate({ layout: value as "classic" | "grid" })
              }
            >
              <SelectTrigger className="h-9">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show columns only for grid layout */}
          {block.layout === "grid" && (
            <div className="space-y-2">
              <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
                Columns
              </label>
              <Select
                value={String(block.columns || 3)}
                onValueChange={(value) => onUpdate({ columns: Number(value) })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Add more images button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={onOpenGalleryPicker}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Add more images
          </Button>
        </div>
      ) : (
        <div
          className="text-center py-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-muted-foreground transition-colors"
          onClick={onOpenGalleryPicker}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            Click to add images from library
          </p>
        </div>
      )}
    </div>
  );
}

// Thumbnail item with arrow buttons for reordering
function ThumbnailItem({
  item,
  index,
  total,
  onMoveLeft,
  onMoveRight,
  onRemove,
  onReplace,
}: {
  item: MediaItem;
  index: number;
  total: number;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.variants?.thumb?.url || item.url}
        alt={item.alt || ""}
        className="w-full h-full object-cover"
      />

      {/* Position badge - top left */}
      <div className="absolute top-2 left-2 bg-zinc-600 text-white text-xs px-2 py-0.5 rounded-full font-normal min-w-[20px] text-center">
        {index + 1}
      </div>

      {/* Controls - top right */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move left button */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onMoveLeft();
          }}
          disabled={isFirst}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Move right button */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onMoveRight();
          }}
          disabled={isLast}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* More options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onSelect={onReplace}>Replace</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
