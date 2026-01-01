"use client";

import { useCallback, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Image as ImageIcon,
  Upload,
  LayoutDashboard,
  LayoutTemplate,
  LayoutGrid,
  MoveHorizontal,
  RotateCcw,
  X,
  Check,
  Loader2,
  Trash2,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { GalleryBlock, MediaItem } from "@/lib/cms/types";
import { Pencil } from "lucide-react";

interface GalleryBlockEditorProps {
  block: GalleryBlock;
  galleryMedia: MediaItem[];
  onUpdate: (updates: Partial<GalleryBlock>) => void;
  onOpenGalleryPicker?: () => void;
  onReplaceImage?: (index: number, file: File) => Promise<void>;
  onUploadFiles?: (files: File[]) => Promise<void>;
  onEditMedia?: (mediaId: string) => void;
}

export function GalleryBlockEditor({
  block,
  galleryMedia,
  onUpdate,
  onOpenGalleryPicker,
  onReplaceImage,
  onUploadFiles,
  onEditMedia,
}: GalleryBlockEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0 && onUploadFiles) {
      const validFiles = Array.from(files).filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/")
      );
      if (validFiles.length > 0) {
        setIsUploading(true);
        try {
          await onUploadFiles(validFiles);
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUploadFiles) {
      const validFiles = Array.from(files).filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/")
      );
      if (validFiles.length > 0) {
        setIsUploading(true);
        try {
          await onUploadFiles(validFiles);
        } finally {
          setIsUploading(false);
        }
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
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
    async (index: number, file: File) => {
      await onReplaceImage?.(index, file);
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
              onReplace={(file) => handleReplaceImage(index, file)}
              onEdit={() => onEditMedia?.(item.id)}
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
                  onReplace={(file) => handleReplaceImage(itemIndex, file)}
                  onEdit={() => onEditMedia?.(item.id)}
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

          {/* Add more images - same as empty state */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "text-center py-8 border-2 border-dashed rounded-lg transition-colors bg-muted/50",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            )}
          >
            {isUploading ? (
              <div className="py-4">
                <Loader2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-1">
                  {isDragging ? "Drop files here" : "Drag & drop files here"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Images and videos (up to 20)
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenGalleryPicker}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Library
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Layout settings popover */}
          <LayoutSettingsPopover
            layout={(block.layout === "classic" || block.layout === "grid") ? block.layout : "classic"}
            columns={block.columns || 1}
            width={block.width || "normal"}
            onApply={(settings) => {
              onUpdate({
                layout: settings.layout,
                columns: settings.columns,
                width: settings.width,
              });
            }}
          />
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "text-center py-8 border-2 border-dashed rounded-lg transition-colors bg-muted/50",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileInput}
            className="hidden"
          />
          {isUploading ? (
            <div className="py-4">
              <Loader2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-1">
                {isDragging ? "Drop files here" : "Drag & drop files here"}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Images and videos (up to 20)
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenGalleryPicker}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Library
                </Button>
              </div>
            </>
          )}
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
  onEdit,
}: {
  item: MediaItem;
  index: number;
  total: number;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  onReplace: (file: File) => void;
  onEdit?: () => void;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const [menuOpen, setMenuOpen] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleReplaceClick = () => {
    replaceInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReplace(file);
    }
    // Reset input so same file can be selected again
    if (replaceInputRef.current) {
      replaceInputRef.current.value = "";
    }
  };

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
      {/* Hidden file input for replace */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

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
      <div className={cn(
        "absolute top-2 right-2 flex items-center gap-1 transition-opacity",
        menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
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
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
            {onEdit && (
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={handleReplaceClick}>
              <Upload className="h-4 w-4 mr-2" />
              Replace
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Layout settings popover component
function LayoutSettingsPopover({
  layout,
  columns,
  width,
  onApply,
}: {
  layout: "classic" | "grid";
  columns: number;
  width: "normal" | "large" | "full";
  onApply: (settings: {
    layout: "classic" | "grid";
    columns: number;
    width: "normal" | "large" | "full";
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tempLayout, setTempLayout] = useState(layout);
  const [tempColumns, setTempColumns] = useState(columns);
  const [tempWidth, setTempWidth] = useState(width);

  // Reset temp values when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTempLayout(layout);
      setTempColumns(columns);
      setTempWidth(width);
    }
    setOpen(isOpen);
  };

  const handleReset = () => {
    setTempLayout("classic");
    setTempColumns(1);
    setTempWidth("normal");
  };

  const handleApply = () => {
    onApply({
      layout: tempLayout,
      columns: tempColumns,
      width: tempWidth,
    });
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div className="flex justify-center">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-3 text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Choose layout
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent 
        className="w-80 p-0" 
        align="center"
        sideOffset={4}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
            Choose layout
          </span>
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-muted-foreground"
              onClick={handleReset}
            >
              <RotateCcw className="h-3 w-3 mr-2" />
              Reset
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Layout */}
          <div>
            <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
              Layout
            </label>
            <Select
              value={tempLayout}
              onValueChange={(value) => setTempLayout(value as "classic" | "grid")}
            >
              <SelectTrigger className="h-9 w-full mt-2">
                <div className="flex items-center gap-2">
                  {tempLayout === "grid" ? (
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                  )}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Columns - only for grid */}
          {tempLayout === "grid" && (
            <div>
              <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
                Columns
              </label>
              <Select
                value={String(tempColumns)}
                onValueChange={(value) => setTempColumns(Number(value))}
              >
                <SelectTrigger className="h-9 w-full mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Column</SelectItem>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Width */}
          <div>
            <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
              Width
            </label>
            <Select
              value={tempWidth}
              onValueChange={(value) => setTempWidth(value as "normal" | "large" | "full")}
            >
              <SelectTrigger className="h-9 w-full mt-2">
                <div className="flex items-center gap-2">
                  <MoveHorizontal className="h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="full">Full width</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-0 space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full h-9"
            onClick={handleApply}
          >
            <Check className="h-3 w-3 mr-2" />
            Apply settings
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-9"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
