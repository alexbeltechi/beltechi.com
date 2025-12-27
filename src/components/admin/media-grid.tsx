"use client";

import { useState, useRef } from "react";
import { Upload, GripVertical, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageOptionsMenu } from "@/components/admin/image-options-menu";
import { IndexPill } from "@/components/lib";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/cms/types";

export interface MediaPreview {
  id: string;
  file?: File;
  url: string;
  type: "image" | "video";
  mediaId?: string;
  isExisting?: boolean;
}

interface MediaGridProps {
  media: MediaPreview[];
  onMediaChange: (media: MediaPreview[]) => void;
  onOpenLibrary: () => void;
  onMediaClick?: (mediaId: string) => void;
  onReplaceMedia?: (index: number) => void;
  maxMedia?: number;
  accept?: string;
  showUpload?: boolean;
  emptyStateText?: string;
  className?: string;
}

export function MediaGrid({
  media,
  onMediaChange,
  onOpenLibrary,
  onMediaClick,
  onReplaceMedia,
  maxMedia = 20,
  accept = "image/*,video/*",
  showUpload = true,
  emptyStateText = "Drag & drop files here",
  className,
}: MediaGridProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newMedia: MediaPreview[] = fileArray.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    onMediaChange([...media, ...newMedia].slice(0, maxMedia));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
      e.target.value = "";
    }
  };

  const removeMedia = (id: string) => {
    onMediaChange(media.filter((m) => m.id !== id));
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/")
      );
      if (validFiles.length > 0) {
        handleFileSelect(validFiles);
      }
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newMedia = [...media];
    const draggedItem = newMedia[draggedIndex];
    newMedia.splice(draggedIndex, 1);
    newMedia.splice(index, 0, draggedItem);
    onMediaChange(newMedia);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        onDragOver={handleFileDragOver}
        onDragEnter={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        onClick={() => media.length === 0 && fileInputRef.current?.click()}
        className={cn(
          "text-center transition-all",
          media.length === 0 && "border-2 border-dashed rounded-lg p-8",
          isDraggingFiles && "border-primary bg-primary/5",
          media.length === 0 &&
            !isDraggingFiles &&
            "border-border hover:border-muted-foreground bg-muted/50 cursor-pointer"
        )}
      >
        {media.length === 0 ? (
          <div>
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-1">
              {isDraggingFiles ? "Drop files here" : emptyStateText}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Images and videos (up to {maxMedia})
            </p>
            <div className="flex items-center justify-center gap-3">
              {showUpload && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLibrary();
                }}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Library
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {media.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() =>
                    item.isExisting &&
                    item.mediaId &&
                    onMediaClick?.(item.mediaId)
                  }
                  className={cn(
                    "relative aspect-square bg-muted rounded-lg overflow-hidden group cursor-pointer ring-1 ring-transparent hover:ring-primary transition-all",
                    draggedIndex === index && "opacity-50 scale-95"
                  )}
                >
                  {item.type === "image" ? (
                    <img
                      src={item.url}
                      alt=""
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}

                  <div className="absolute bottom-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="p-1.5 bg-black/60 rounded-full">
                      <GripVertical className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageOptionsMenu
                      onEdit={
                        item.isExisting && item.mediaId
                          ? () => onMediaClick?.(item.mediaId!)
                          : undefined
                      }
                      onCopyUrl={() => navigator.clipboard.writeText(item.url)}
                      onReplace={
                        onReplaceMedia
                          ? () => onReplaceMedia(index)
                          : undefined
                      }
                      onDelete={() => removeMedia(item.id)}
                    />
                  </div>

                  <IndexPill
                    index={index + 1}
                    className="absolute top-2 left-2"
                  />
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Drag to reorder · {media.length}/{maxMedia} files
            </p>

            <div className="flex items-center justify-center gap-3">
              {showUpload && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenLibrary()}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Library
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to convert MediaItems to MediaPreviews
export function mediaItemsToPreview(items: MediaItem[]): MediaPreview[] {
  return items.map((item) => ({
    id: Math.random().toString(36).slice(2),
    url: item.variants?.thumb?.url || item.url,
    type: item.mime.startsWith("video/") ? "video" : "image",
    isExisting: true,
    mediaId: item.id,
  }));
}

