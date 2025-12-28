"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Trash2,
  Image,
  Film,
  Loader2,
  X,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  RefreshCw,
  FolderOpen,
  FileImage,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import type { MediaItem } from "@/lib/cms/types";
import { formatRelativeTime } from "@/lib/utils";
import { ImageOptionsMenu } from "@/components/admin/image-options-menu";
import { MediaDetailModal } from "@/components/admin/media-detail-modal";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  compressImages,
  validateFilesForUpload,
  getUploadErrorMessage,
  formatFileSize,
  isCompressibleImage,
  type CompressionProgress,
} from "@/lib/image-compression";
import { PageHeader } from "@/components/lib";
import { toast } from "sonner";

type FilterType = "all" | "images" | "video" | "unattached";
type SortOption = "newest" | "oldest" | "largest" | "smallest" | "name-asc" | "name-desc";

interface UsedMediaResponse {
  usedMediaIds: string[];
}

interface UploadProgress {
  fileName: string;
  status: "compressing" | "uploading" | "done" | "error";
  progress: number;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
  file?: File; // Keep reference for retry
}

export default function MediaLibraryPage() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [usedMediaIds, setUsedMediaIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isUploading = useMemo(() => {
    return Array.from(uploadProgress.values()).some(
      (p) => p.status === "compressing" || p.status === "uploading"
    );
  }, [uploadProgress]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  
  // Mobile filter modal
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  
  // Replace functionality
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [showReplacePicker, setShowReplacePicker] = useState(false);
  
  // Batch replace
  const [showBatchReplaceDialog, setShowBatchReplaceDialog] = useState(false);
  const [batchReplaceMode, setBatchReplaceMode] = useState<"single" | "folder">("folder");
  const [batchReplacing, setBatchReplacing] = useState(false);
  const [batchReplaceProgress, setBatchReplaceProgress] = useState<{matched: number; total: number; current: string} | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const [mediaRes, usedRes] = await Promise.all([
        fetch("/api/admin/media"),
        fetch("/api/admin/media/used"),
      ]);
      const mediaData = await mediaRes.json();
      const usedData: UsedMediaResponse = await usedRes.json();

      setMedia(mediaData.data || []);
      setUsedMediaIds(new Set(usedData.usedMediaIds || []));
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Get unique months from media for date filter
  const availableMonths = useMemo(() => {
    const months = new Map<string, string>();
    media.forEach((item) => {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      months.set(key, label);
    });
    return Array.from(months.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [media]);

  // Filtered media
  const filteredMedia = useMemo(() => {
    const filtered = media.filter((item) => {
      if (
        searchQuery &&
        !item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.filename.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      if (typeFilter === "images" && !item.mime.startsWith("image/")) {
        return false;
      }
      if (typeFilter === "video" && !item.mime.startsWith("video/")) {
        return false;
      }
      if (typeFilter === "unattached" && usedMediaIds.has(item.id)) {
        return false;
      }

      if (dateFilter !== "all") {
        const date = new Date(item.createdAt);
        const itemMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (itemMonth !== dateFilter) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "largest":
          return (b.size || 0) - (a.size || 0);
        case "smallest":
          return (a.size || 0) - (b.size || 0);
        case "name-asc":
          return (a.title || a.filename).localeCompare(b.title || b.filename);
        case "name-desc":
          return (b.title || b.filename).localeCompare(a.title || a.filename);
        default:
          return 0;
      }
    });
  }, [media, searchQuery, typeFilter, dateFilter, usedMediaIds, sortBy]);

  // Navigation for modal
  const currentIndex = selectedMediaId ? filteredMedia.findIndex((m) => m.id === selectedMediaId) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < filteredMedia.length - 1;

  const handleNavigate = (direction: "prev" | "next") => {
    if (direction === "prev" && canGoPrev) {
      setSelectedMediaId(filteredMedia[currentIndex - 1].id);
    } else if (direction === "next" && canGoNext) {
      setSelectedMediaId(filteredMedia[currentIndex + 1].id);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (!selectedMediaId) return;
      if (e.key === "ArrowLeft") handleNavigate("prev");
      if (e.key === "ArrowRight") handleNavigate("next");
      if (e.key === "Escape") setSelectedMediaId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMediaId, currentIndex, filteredMedia]);

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
            // Handle upload error - store file for retry
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
                file: result.file, // Store compressed file for retry
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
              file: result.file, // Store compressed file for retry
            });
            return newMap;
          });
        }
      }

      // Refresh media list
      await fetchMedia();

      // Clear progress after a delay if all successful
      setTimeout(() => {
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          for (const [key, value] of newMap) {
            if (value.status === "done") {
              newMap.delete(key);
            }
          }
          return newMap;
        });
      }, 3000);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("An unexpected error occurred. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    const item = media.find((m) => m.id === id);
    const itemName = item?.title || item?.originalName || "this file";
    
    if (!confirm(`Are you sure you want to permanently delete "${itemName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete");
      }
      setMedia(media.filter((m) => m.id !== id));
      if (selectedMediaId === id) setSelectedMediaId(null);
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete the file. Please try again.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to permanently delete ${selectedIds.size} file(s)? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      for (const id of selectedIds) {
        await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      }

      setMedia(media.filter((m) => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
      setSelectedMediaId(null);
      toast.success(`Successfully deleted ${selectedIds.size} file(s)`);
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete some files");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map((m) => m.id)));
    }
  };

  const selectAllUnused = () => {
    const unusedIds = filteredMedia
      .filter((m) => !usedMediaIds.has(m.id))
      .map((m) => m.id);
    setSelectedIds(new Set(unusedIds));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const cancelBulkSelect = () => {
    setSelectedIds(new Set());
  };

  const createPostWithMedia = () => {
    if (selectedIds.size === 0) return;
    // Pass media IDs via query params
    const mediaIds = Array.from(selectedIds).join(",");
    router.push(`/admin/content/posts/new?media=${mediaIds}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleReplaceFromMenu = (id: string) => {
    setReplaceTargetId(id);
    setShowReplacePicker(true);
  };

  const handleReplaceFromModal = (id: string) => {
    setSelectedMediaId(null); // Close the detail modal
    setReplaceTargetId(id);
    setShowReplacePicker(true);
  };

  const handleReplaceSelect = (items: MediaItem[]) => {
    if (items.length > 0 && replaceTargetId) {
      // In media library context, "replace" means we're swapping the position
      // of the old item with the new selected item in the UI view
      // For now, we just select the new item to view it
      setSelectedMediaId(items[0].id);
    }
    setReplaceTargetId(null);
    setShowReplacePicker(false);
  };

  // Extract base filename (without shortId suffix) for matching
  const extractBaseName = (filename: string): string => {
    // filename format: "name-shortId.ext" or "name-shortId-variant.ext"
    // We want to match against "name" part
    const withoutExt = filename.replace(/\.[^.]+$/, "");
    // Remove the shortId (last segment after dash that's 4 hex chars)
    const parts = withoutExt.split("-");
    // Remove variant suffix if present (thumb, display, etc.)
    const variants = ["thumb", "display", "large", "medium", "original"];
    if (variants.includes(parts[parts.length - 1])) {
      parts.pop();
    }
    // Remove shortId (4 hex chars)
    if (parts.length > 1 && /^[a-f0-9]{4}$/i.test(parts[parts.length - 1])) {
      parts.pop();
    }
    return parts.join("-").toLowerCase();
  };

  // Handle batch replace with folder
  const handleBatchReplaceFolder = async (files: FileList) => {
    if (selectedIds.size === 0 || files.length === 0) return;

    const selectedItems = media.filter((m) => selectedIds.has(m.id));
    
    // Create a map of base names to replacement files from the folder
    const folderFiles = new Map<string, File>();
    for (const file of Array.from(files)) {
      // Skip non-image/video files
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;
      const baseName = file.name.replace(/\.[^.]+$/, "").toLowerCase();
      folderFiles.set(baseName, file);
    }

    // Find matches: for each selected item, find corresponding file in folder
    const matches: Array<{ item: MediaItem; file: File }> = [];
    const unmatched: MediaItem[] = [];

    for (const item of selectedItems) {
      const itemBaseName = extractBaseName(item.filename);
      
      // Try exact match first, then partial match
      let matchedFile = folderFiles.get(itemBaseName);
      
      // If no exact match, try to find partial match
      if (!matchedFile) {
        for (const [folderBaseName, file] of folderFiles) {
          if (itemBaseName === folderBaseName || 
              itemBaseName.startsWith(folderBaseName) || 
              folderBaseName.startsWith(itemBaseName)) {
            matchedFile = file;
            break;
          }
        }
      }

      if (matchedFile) {
        matches.push({ item, file: matchedFile });
      } else {
        unmatched.push(item);
      }
    }

    // Show confirmation with match count
    if (matches.length === 0) {
      toast.error("No matching files found in the folder. Make sure the filenames match the original filenames (e.g., '000004.jpg' matches '000004-xyz.webp').");
      return;
    }

    if (unmatched.length > 0) {
      const proceed = confirm(
        `Found ${matches.length} matching files out of ${selectedItems.length} selected.\n\n` +
        `${unmatched.length} items have no match and will be skipped:\n` +
        `${unmatched.slice(0, 5).map(i => `• ${i.title || i.filename}`).join("\n")}` +
        `${unmatched.length > 5 ? `\n... and ${unmatched.length - 5} more` : ""}\n\n` +
        `Continue with ${matches.length} replacements?`
      );
      if (!proceed) return;
    }

    setBatchReplacing(true);
    setBatchReplaceProgress({ matched: 0, total: matches.length, current: "" });

    try {
      let replacedCount = 0;

      for (const { item, file } of matches) {
        setBatchReplaceProgress({ 
          matched: replacedCount, 
          total: matches.length, 
          current: item.title || item.filename 
        });

        // Replace media (uploads new, updates references, deletes old)
        const formData = new FormData();
        formData.append("file", file);

        const replaceRes = await fetch(`/api/admin/media/${item.id}/replace`, {
          method: "POST",
          body: formData,
        });

        if (replaceRes.ok) {
          replacedCount++;
        }
      }

      setBatchReplaceProgress({ matched: replacedCount, total: matches.length, current: "Done!" });

      // Refresh media list
      await fetchMedia();
      setSelectedIds(new Set());

      // Close dialog after a short delay
      setTimeout(() => {
        setShowBatchReplaceDialog(false);
        setBatchReplacing(false);
        setBatchReplaceProgress(null);
      }, 1500);
    } catch (error) {
      console.error("Batch replace failed:", error);
      toast.error("Batch replace failed. Please try again.");
      setBatchReplacing(false);
      setBatchReplaceProgress(null);
    }
  };

  // Handle batch replace with single file
  const handleBatchReplaceSingle = async (file: File) => {
    if (selectedIds.size === 0) return;

    setBatchReplacing(true);
    setBatchReplaceProgress({ matched: 0, total: selectedIds.size, current: "" });

    try {
      const selectedItems = media.filter((m) => selectedIds.has(m.id));
      let replacedCount = 0;

      for (const item of selectedItems) {
        setBatchReplaceProgress({ matched: replacedCount, total: selectedIds.size, current: item.title || item.filename });

        // Replace media (uploads new, updates references, deletes old)
        const formData = new FormData();
        formData.append("file", file);

        const replaceRes = await fetch(`/api/admin/media/${item.id}/replace`, {
          method: "POST",
          body: formData,
        });

        if (replaceRes.ok) {
          replacedCount++;
        }
      }

      setBatchReplaceProgress({ matched: replacedCount, total: selectedIds.size, current: "Done!" });

      // Refresh media list
      await fetchMedia();
      setSelectedIds(new Set());

      // Close dialog after a short delay
      setTimeout(() => {
        setShowBatchReplaceDialog(false);
        setBatchReplacing(false);
        setBatchReplaceProgress(null);
      }, 1500);
    } catch (error) {
      console.error("Batch replace failed:", error);
      toast.error("Batch replace failed. Please try again.");
      setBatchReplacing(false);
      setBatchReplaceProgress(null);
    }
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

  // Dismiss a single error card
  const dismissError = (fileName: string) => {
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileName);
      return newMap;
    });
  };

  // Retry a failed upload
  const handleRetry = async (fileName: string) => {
    const item = uploadProgress.get(fileName);
    if (!item?.file) return;

    // Update status to uploading
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      newMap.set(fileName, {
        ...item,
        status: "uploading",
        progress: 50,
        error: undefined,
      });
      return newMap;
    });

    const formData = new FormData();
    formData.append("file", item.file);

    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        // Mark as done
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(fileName, {
            ...item,
            status: "done",
            progress: 100,
            error: undefined,
            file: undefined, // Clear file reference
          });
          return newMap;
        });
        
        // Refresh media list
        await fetchMedia();

        // Clear after delay
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(fileName);
            if (current?.status === "done") {
              newMap.delete(fileName);
            }
            return newMap;
          });
        }, 3000);
      } else {
        const errorMsg = getUploadErrorMessage(res.status, fileName);
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(fileName, {
            ...item,
            status: "error",
            progress: 0,
            error: errorMsg,
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error("Retry upload error:", error);
      setUploadProgress((prev) => {
        const newMap = new Map(prev);
        newMap.set(fileName, {
          ...item,
          status: "error",
          progress: 0,
          error: "Network error. Please check your connection.",
        });
        return newMap;
      });
    }
  };

  const typeFilterLabels: Record<FilterType, string> = {
    all: "All media items",
    images: "Images",
    video: "Video",
    unattached: "Unused",
  };

  const sortLabels: Record<SortOption, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    largest: "Largest first",
    smallest: "Smallest first",
    "name-asc": "Name (A-Z)",
    "name-desc": "Name (Z-A)",
  };

  // Check if any filters are active (for mobile indicator and reset button)
  const hasActiveFilters = typeFilter !== "all" || dateFilter !== "all" || sortBy !== "newest" || searchQuery !== "";

  return (
    <div className="flex flex-col h-full">
      {/* Header - 56px tall */}
      <div className="border-b px-4 h-14 flex items-center">
        <PageHeader title="Media" count={media.length}>
          <Button asChild disabled={isUploading}>
            <label className="cursor-pointer">
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? "Processing..." : "Upload"}
              <input
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
                disabled={isUploading}
              />
            </label>
          </Button>
        </PageHeader>
      </div>

      {/* Filters Row - 56px tall */}
      <div className="border-b px-4 h-14 flex items-center gap-3">
        {/* Select All Checkbox - matching posts page */}
        <div className="flex items-center justify-center w-8 shrink-0">
          <Checkbox
            checked={selectedIds.size > 0 && selectedIds.size === filteredMedia.length}
            onCheckedChange={selectAll}
            aria-label="Select all"
          />
        </div>

        {/* Search - fills available space on desktop */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Mobile/Tablet Filter Button - visible below xl (1280px) */}
        <Button
          variant="outline"
          size="icon"
          className="xl:hidden relative shrink-0"
          onClick={() => setShowFilterModal(true)}
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {hasActiveFilters && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>

        {/* Type Filter - Desktop (xl+) */}
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FilterType)}>
          <SelectTrigger className="w-[170px] hidden xl:flex">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            {(["all", "images", "video", "unattached"] as FilterType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {typeFilterLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Filter - Desktop (xl+) */}
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px] hidden xl:flex">
            <SelectValue placeholder="All dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            {availableMonths.map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort - Desktop (xl+) */}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-[150px] hidden xl:flex">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(sortLabels) as SortOption[]).map((option) => (
              <SelectItem key={option} value={option}>
                {sortLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset Filters - Desktop only (xl+) */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden xl:flex shrink-0"
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("all");
              setDateFilter("all");
              setSortBy("newest");
            }}
            aria-label="Reset filters"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        {/* Three-dot Bulk Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={selectAll}>
              {selectedIds.size === filteredMedia.length ? "Deselect all" : "Select all"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={selectAllUnused}>
              Select unused
            </DropdownMenuItem>
            {selectedIds.size > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={createPostWithMedia}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create post ({selectedIds.size})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBatchReplaceDialog(true)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Replace ({selectedIds.size})
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleBulkDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedIds.size})
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Error Banner */}
        {uploadError && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
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
          <div className="mb-4 space-y-2">
            {Array.from(uploadProgress.values()).map((item) => (
              <Card
                key={item.fileName}
                className={`p-3 ${
                  item.status === "error"
                    ? "bg-destructive/10 border-destructive/20"
                    : item.status === "done"
                    ? "bg-green-500/10 border-green-500/20"
                    : ""
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
                      {item.status === "compressing" && "Optimizing image..."}
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

                  {/* Retry and Dismiss buttons for errors */}
                  {item.status === "error" && (
                    <div className="flex items-center gap-2 shrink-0">
                      {item.file && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(item.fileName)}
                          className="h-7 px-2 text-xs"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dismissError(item.fileName)}
                        className="h-7 w-7"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
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
              </Card>
            ))}
          </div>
        )}

      {/* Main Grid - Drag Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`rounded-xl transition-colors ${
          dragActive ? "bg-accent" : ""
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMedia.length === 0 && media.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 lg:py-20 text-center !gap-0">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Upload className="w-7 h-7 lg:w-8 lg:h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No media yet</h3>
            <p className="text-muted-foreground text-sm mb-2">
              Drag & drop files here or click upload
            </p>
            <p className="text-muted-foreground text-xs mb-6">
              Images are automatically optimized for the web
            </p>
            <Button
              asChild
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Upload
                <input
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
              </label>
            </Button>
          </Card>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 lg:py-20 text-center">
            <p className="text-foreground font-medium mb-1">No results found</p>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMediaId(item.id)}
                className="cursor-pointer group"
              >
                {/* Image Square */}
                <div
                  className={`relative aspect-square bg-muted rounded-lg overflow-hidden transition-all ${
                    selectedIds.has(item.id)
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
                  ) : item.poster?.url ? (
                    <img
                      src={item.poster.url}
                      alt={item.alt || item.originalName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Film className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Type badge - Top Left */}
                  <div className="absolute top-2 left-2">
                    {item.mime.startsWith("image/") ? (
                      <Image className="w-4 h-4 text-white drop-shadow-md" />
                    ) : (
                      <Film className="w-4 h-4 text-white drop-shadow-md" />
                    )}
                  </div>

                  {/* Checkbox - Top Right (visible on hover on desktop, always on mobile or when selected) */}
                  <button
                    type="button"
                    className={`absolute top-1 right-1 z-10 w-9 h-9 flex items-center justify-center rounded-md hover:bg-black/30 transition-all ${
                      selectedIds.has(item.id)
                        ? "opacity-100"
                        : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                  </button>

                  {/* Three-dot menu - visible on hover when no items selected */}
                  {selectedIds.size === 0 && (
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImageOptionsMenu
                        onEdit={() => setSelectedMediaId(item.id)}
                        onCreatePost={() => router.push(`/admin/content/posts/new?media=${item.id}`)}
                        onCopyUrl={() => copyToClipboard(item.url)}
                        onReplace={() => handleReplaceFromMenu(item.id)}
                        onDelete={() => handleDelete(item.id)}
                      />
                    </div>
                  )}

                  {/* Unused indicator */}
                  {!usedMediaIds.has(item.id) && (
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-amber-500 rounded text-[10px] text-white font-medium">
                      Unused
                    </div>
                  )}
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
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Media Detail Modal - shared component */}
      {selectedIds.size === 0 && (
        <MediaDetailModal
          mediaId={selectedMediaId}
          onClose={() => setSelectedMediaId(null)}
          onDelete={handleDelete}
          onReplace={handleReplaceFromModal}
          showDelete={true}
          showReplace={true}
          onNavigate={handleNavigate}
          canNavigatePrev={canGoPrev}
          canNavigateNext={canGoNext}
        />
      )}

      {/* Replace Media Picker */}
      <MediaPicker
        isOpen={showReplacePicker}
        onClose={() => {
          setShowReplacePicker(false);
          setReplaceTargetId(null);
        }}
        onSelect={handleReplaceSelect}
        multiple={false}
        accept={["image/*", "video/*"]}
      />

      {/* Batch Replace Dialog */}
      <Dialog open={showBatchReplaceDialog} onOpenChange={(open) => !batchReplacing && setShowBatchReplaceDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace {selectedIds.size} selected files</DialogTitle>
            <DialogDescription>
              Choose how you want to replace the selected media files.
            </DialogDescription>
          </DialogHeader>

          {batchReplaceProgress ? (
            <div className="py-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {batchReplaceProgress.current === "Done!" 
                      ? `Replaced ${batchReplaceProgress.matched} of ${batchReplaceProgress.total} files`
                      : `Replacing: ${batchReplaceProgress.current}`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {batchReplaceProgress.matched} / {batchReplaceProgress.total} processed
                  </p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(batchReplaceProgress.matched / batchReplaceProgress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <RadioGroup value={batchReplaceMode} onValueChange={(v) => setBatchReplaceMode(v as "single" | "folder")}>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer" onClick={() => setBatchReplaceMode("folder")}>
                    <RadioGroupItem value="folder" id="folder" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="folder" className="font-medium cursor-pointer flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Select folder (match by filename)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Files from the folder will be matched to selected items by filename. Best for batch updates.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer" onClick={() => setBatchReplaceMode("single")}>
                    <RadioGroupItem value="single" id="single" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="single" className="font-medium cursor-pointer flex items-center gap-2">
                        <FileImage className="w-4 h-4" />
                        Select single file (replace all)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        All {selectedIds.size} selected items will be replaced with the same image.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBatchReplaceDialog(false)}>
                  Cancel
                </Button>
                <Button asChild>
                  <label className="cursor-pointer">
                    {batchReplaceMode === "folder" ? (
                      <>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Choose Folder
                        <input
                          type="file"
                          multiple
                          // @ts-expect-error webkitdirectory is not in the type definitions
                          webkitdirectory=""
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleBatchReplaceFolder(e.target.files);
                              e.target.value = "";
                            }
                          }}
                          className="hidden"
                          accept="image/*,video/*"
                        />
                      </>
                    ) : (
                      <>
                        <FileImage className="mr-2 h-4 w-4" />
                        Choose File
                        <input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleBatchReplaceSingle(e.target.files[0]);
                              e.target.value = "";
                            }
                          }}
                          className="hidden"
                          accept="image/*,video/*"
                        />
                      </>
                    )}
                  </label>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="sm:max-w-[320px] max-w-[calc(100%-32px)]">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type Filter */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FilterType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {(["all", "images", "video", "unattached"] as FilterType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {typeFilterLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dates</SelectItem>
                  {availableMonths.map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <Label>Sort by</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {sortLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setDateFilter("all");
                  setSortBy("newest");
                }}
              >
                Reset filters
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
