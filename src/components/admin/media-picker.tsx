"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  X,
  Search,
  Image,
  Film,
  Loader2,
  Check,
  Upload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { MediaItem } from "@/lib/cms/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  compressImages,
  validateFilesForUpload,
  getUploadErrorMessage,
  formatFileSize,
  isCompressibleImage,
  type CompressionProgress,
} from "@/lib/image-compression";

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  multiple?: boolean;
  accept?: string[]; // e.g., ["image/*", "video/*"]
  maxSelect?: number;
}

interface UploadProgress {
  fileName: string;
  status: "compressing" | "uploading" | "done" | "error";
  progress: number;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
}

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  multiple = true,
  accept,
  maxSelect,
}: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isUploading = useMemo(() => {
    return Array.from(uploadProgress.values()).some(
      (p) => p.status === "compressing" || p.status === "uploading"
    );
  }, [uploadProgress]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      setMedia(data.data || []);
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setSelectedIds(new Set());
      setSearchQuery("");
      setUploadProgress(new Map());
      setUploadError(null);
    }
  }, [isOpen, fetchMedia]);

  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Clear previous errors
    setUploadError(null);

    // Validate files first
    const validationError = validateFilesForUpload(fileArray);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    // Initialize progress for all files
    const initialProgress = new Map<string, UploadProgress>();
    fileArray.forEach((file) => {
      initialProgress.set(file.name, {
        fileName: file.name,
        status: isCompressibleImage(file) ? "compressing" : "uploading",
        progress: 0,
        originalSize: file.size,
      });
    });
    setUploadProgress(initialProgress);

    const uploadedIds: string[] = [];

    try {
      // Compress images first
      const compressionResults = await compressImages(
        fileArray,
        (fileName, progress: CompressionProgress) => {
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileName);
            if (existing) {
              newMap.set(fileName, {
                ...existing,
                status: "compressing",
                progress: Math.round(progress.progress * 0.5), // Compression is first 50%
                compressedSize: progress.compressedSize,
              });
            }
            return newMap;
          });
        }
      );

      // Upload compressed files
      for (let i = 0; i < compressionResults.length; i++) {
        const result = compressionResults[i];
        const originalFile = fileArray[i];

        // Update status to uploading
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(originalFile.name, {
            fileName: originalFile.name,
            status: "uploading",
            progress: 50,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
          });
          return newMap;
        });

        const formData = new FormData();
        formData.append("file", result.file);

        try {
          const res = await fetch("/api/admin/media", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.data?.id) {
              uploadedIds.push(data.data.id);
            }

            // Mark as done
            setUploadProgress((prev) => {
              const newMap = new Map(prev);
              newMap.set(originalFile.name, {
                fileName: originalFile.name,
                status: "done",
                progress: 100,
                originalSize: result.originalSize,
                compressedSize: result.compressedSize,
              });
              return newMap;
            });
          } else {
            // Handle upload error
            const errorMsg = getUploadErrorMessage(res.status, originalFile.name);
            setUploadProgress((prev) => {
              const newMap = new Map(prev);
              newMap.set(originalFile.name, {
                fileName: originalFile.name,
                status: "error",
                progress: 0,
                originalSize: result.originalSize,
                compressedSize: result.compressedSize,
                error: errorMsg,
              });
              return newMap;
            });
          }
        } catch (error) {
          console.error("Upload error:", error);
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            newMap.set(originalFile.name, {
              fileName: originalFile.name,
              status: "error",
              progress: 0,
              originalSize: result.originalSize,
              error: "Network error. Please check your connection.",
            });
            return newMap;
          });
        }
      }

      // Refresh media list
      await fetchMedia();

      // Auto-select the newly uploaded files
      if (uploadedIds.length > 0) {
        if (multiple) {
          const newSelected = new Set(selectedIds);
          uploadedIds.forEach((id) => {
            if (!maxSelect || newSelected.size < maxSelect) {
              newSelected.add(id);
            }
          });
          setSelectedIds(newSelected);
        } else {
          // Single select: select the first uploaded file
          setSelectedIds(new Set([uploadedIds[0]]));
        }
      }

      // Clear progress after a delay if all successful
      const hasErrors = Array.from(uploadProgress.values()).some(
        (p) => p.status === "error"
      );
      if (!hasErrors) {
        setTimeout(() => {
          setUploadProgress(new Map());
        }, 2000);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("An unexpected error occurred. Please try again.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      // Only set inactive if leaving the modal entirely
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Filter for valid file types
      const validFiles = Array.from(e.dataTransfer.files).filter(
        (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
      );
      if (validFiles.length > 0) {
        handleUpload(validFiles);
      }
    }
  };

  // Filter media based on accept types and search
  const filteredMedia = useMemo(() => {
    return media.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesOriginalName = item.originalName?.toLowerCase().includes(query);
        const matchesFilename = item.filename?.toLowerCase().includes(query);
        const matchesTitle = item.title?.toLowerCase().includes(query);
        if (!matchesOriginalName && !matchesFilename && !matchesTitle) {
          return false;
        }
      }

      // Accept filter
      if (accept && accept.length > 0) {
        const matches = accept.some((type) => {
          if (type.endsWith("/*")) {
            const prefix = type.replace("/*", "/");
            return item.mime.startsWith(prefix);
          }
          return item.mime === type;
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [media, searchQuery, accept]);

  const toggleSelect = (id: string) => {
    if (!multiple) {
      // Single select mode
      if (selectedIds.has(id)) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set([id]));
      }
      return;
    }

    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (maxSelect && newSelected.size >= maxSelect) {
        return; // Don't add if at max
      }
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const selectedItems = media.filter((m) => selectedIds.has(m.id));
    onSelect(selectedItems);
    onClose();
  };

  const clearError = () => {
    setUploadError(null);
    // Also clear error items from progress
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      for (const [key, value] of newMap) {
        if (value.status === "error") {
          newMap.delete(key);
        }
      }
      return newMap;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative bg-background border border-border rounded-xl w-full max-w-4xl max-h-[85vh] mx-4 flex flex-col overflow-hidden transition-colors ${
          dragActive ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">
              Choose from Library
            </h2>
            <p className="text-sm text-muted-foreground">
              {multiple
                ? maxSelect
                  ? `Select up to ${maxSelect} files`
                  : "Select files from your media library"
                : "Select a file from your media library"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Error Banner */}
        {uploadError && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">{uploadError}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-6 w-6"
              onClick={clearError}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress.size > 0 && (
          <div className="mx-6 mt-4 space-y-2">
            {Array.from(uploadProgress.values()).map((item) => (
              <div
                key={item.fileName}
                className={`p-3 rounded-lg border ${
                  item.status === "error"
                    ? "bg-destructive/10 border-destructive/20"
                    : item.status === "done"
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-muted border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.status === "compressing" && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {item.status === "uploading" && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {item.status === "done" && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  {item.status === "error" && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.status === "compressing" && "Optimizing..."}
                      {item.status === "uploading" && "Uploading..."}
                      {item.status === "done" && (
                        <>
                          {item.originalSize && item.compressedSize && item.originalSize !== item.compressedSize ? (
                            <>
                              {formatFileSize(item.originalSize)} → {formatFileSize(item.compressedSize)}
                              <span className="text-green-600 ml-1">
                                ({Math.round((1 - item.compressedSize / item.originalSize) * 100)}% smaller)
                              </span>
                            </>
                          ) : (
                            item.originalSize && formatFileSize(item.originalSize)
                          )}
                        </>
                      )}
                      {item.status === "error" && (
                        <span className="text-destructive">{item.error}</span>
                      )}
                    </p>
                  </div>

                  {(item.status === "compressing" || item.status === "uploading") && (
                    <span className="text-xs text-muted-foreground">{item.progress}%</span>
                  )}
                </div>

                {/* Progress bar */}
                {(item.status === "compressing" || item.status === "uploading") && (
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-auto p-4 relative">
          {/* Drag overlay */}
          {dragActive && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <Upload className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="text-primary font-medium">Drop files to upload</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Images will be automatically optimized
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Image className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {media.length === 0
                  ? "No media uploaded yet"
                  : "No media matches your search"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filteredMedia.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isDisabled =
                  multiple &&
                  maxSelect &&
                  selectedIds.size >= maxSelect &&
                  !isSelected;

                return (
                  <div
                    key={item.id}
                    onClick={() => !isDisabled && toggleSelect(item.id)}
                    className={`cursor-pointer group ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {/* Image Square */}
                    <div
                      className={`relative aspect-square bg-muted rounded-lg overflow-hidden transition-all ${
                        isSelected
                          ? "ring-2 ring-primary"
                          : "ring-1 ring-border group-hover:ring-foreground/30"
                      }`}
                    >
                      {item.mime.startsWith("image/") ? (
                        <img
                          src={item.variants?.thumb?.url || item.url}
                          alt={item.alt || item.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Film className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Selection checkbox */}
                      <div className="absolute top-2 right-2">
                        <Checkbox
                          checked={isSelected}
                          className="h-5 w-5 border-2 border-white bg-white/20 backdrop-blur-sm shadow-md data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-primary"
                        />
                      </div>

                      {/* Type badge */}
                      <div className="absolute top-2 left-2">
                        {item.mime.startsWith("image/") ? (
                          <Image className="w-4 h-4 text-white drop-shadow-md" />
                        ) : (
                          <Film className="w-4 h-4 text-white drop-shadow-md" />
                        )}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="mt-2 px-0.5">
                      {item.title && (
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.title}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {item.filename}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUpload(e.target.files);
                  e.target.value = "";
                }
              }}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {isUploading ? "Processing..." : "Upload"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              {multiple ? `Add ${selectedIds.size} file${selectedIds.size !== 1 ? "s" : ""}` : "Select"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
