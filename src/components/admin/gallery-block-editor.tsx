"use client";

import { useState, useCallback } from "react";
import { GripVertical, MoreVertical, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // Track if we're interacting with dropdown to prevent drag
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    // Don't start drag if menu is open or we clicked on menu area
    if (isMenuOpen) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
  }, [isMenuOpen]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newMediaIds = [...(block.mediaIds || [])];
    const [removed] = newMediaIds.splice(draggedIndex, 1);
    newMediaIds.splice(index, 0, removed);

    onUpdate({ mediaIds: newMediaIds });
    setDraggedIndex(index);
  }, [draggedIndex, block.mediaIds, onUpdate]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    console.log("Remove image at index:", index);
    const currentMediaIds = block.mediaIds || [];
    const newMediaIds = currentMediaIds.filter((_, i) => i !== index);
    console.log("Old mediaIds:", currentMediaIds);
    console.log("New mediaIds:", newMediaIds);
    onUpdate({ mediaIds: newMediaIds });
  }, [block.mediaIds, onUpdate]);

  const handleReplaceImage = useCallback((index: number) => {
    console.log("Replace image at index:", index);
    onReplaceImage?.(index);
  }, [onReplaceImage]);

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
              draggedIndex={draggedIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onRemove={handleRemoveImage}
              onReplace={handleReplaceImage}
              onMenuOpenChange={setIsMenuOpen}
            />
          ))}
        </div>
      );
    }

    // Classic layout preview
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
                  draggedIndex={draggedIndex}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onRemove={handleRemoveImage}
                  onReplace={handleReplaceImage}
                  onMenuOpenChange={setIsMenuOpen}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {galleryMedia && galleryMedia.length > 0 ? (
        <div className="space-y-3">
          {/* Image grid with layout preview */}
          {renderLayoutPreview()}

          {/* Layout selector */}
          <div className="space-y-2">
            <Label className="text-xs">Layout</Label>
            <Select
              value={block.layout || "classic"}
              onValueChange={(value) =>
                onUpdate({ layout: value as "classic" | "grid" })
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic (Auto)</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show columns only for grid layout */}
          {block.layout === "grid" && (
            <div className="space-y-2">
              <Label className="text-xs">Columns</Label>
              <Select
                value={String(block.columns || 3)}
                onValueChange={(value) => onUpdate({ columns: Number(value) })}
              >
                <SelectTrigger className="h-8">
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onOpenGalleryPicker}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add More Images
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Drag to reorder · {galleryMedia.length} images
          </p>
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

// Separate component for thumbnail to isolate dropdown state
function ThumbnailItem({
  item,
  index,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
  onRemove,
  onReplace,
  onMenuOpenChange,
}: {
  item: MediaItem;
  index: number;
  draggedIndex: number | null;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onRemove: (index: number) => void;
  onReplace: (index: number) => void;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuOpenChange = (open: boolean) => {
    setMenuOpen(open);
    onMenuOpenChange(open);
  };

  return (
    <div
      draggable={!menuOpen}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={`relative aspect-square rounded-md overflow-hidden bg-muted group transition-opacity ${
        draggedIndex === index ? "opacity-50" : ""
      } ${menuOpen ? "" : "cursor-move"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.variants?.thumb?.url || item.url}
        alt={item.alt || ""}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Drag handle indicator */}
      <div className="absolute bottom-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="p-1.5 bg-black/60 rounded-full">
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Three-dot menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem
              onSelect={() => {
                console.log("Replace selected for index:", index);
                onReplace(index);
              }}
            >
              Replace
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                console.log("Remove selected for index:", index);
                onRemove(index);
              }}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Image number indicator */}
      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium pointer-events-none">
        {index + 1}
      </div>
    </div>
  );
}
