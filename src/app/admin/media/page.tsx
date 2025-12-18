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
  CheckCircle2,
  Circle,
  Plus,
} from "lucide-react";
import type { MediaItem } from "@/lib/cms/types";
import { formatRelativeTime } from "@/lib/utils";
import { ImageOptionsMenu } from "@/components/admin/image-options-menu";
import { MediaDetailModal } from "@/components/admin/media-detail-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterType = "all" | "images" | "video" | "unattached";

interface UsedMediaResponse {
  usedMediaIds: string[];
}

export default function MediaLibraryPage() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [usedMediaIds, setUsedMediaIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Bulk select
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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
    return media.filter((item) => {
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
  }, [media, searchQuery, typeFilter, dateFilter, usedMediaIds]);

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
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        await fetch("/api/admin/media", {
          method: "POST",
          body: formData,
        });
      }

      await fetchMedia();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setMedia(media.filter((m) => m.id !== id));
    if (selectedMediaId === id) setSelectedMediaId(null);
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
      setBulkSelectMode(false);
      setSelectedMediaId(null);
    } catch (error) {
      console.error("Bulk delete failed:", error);
      alert("Failed to delete some files");
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
    setBulkSelectMode(false);
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

  const typeFilterLabels: Record<FilterType, string> = {
    all: "All media items",
    images: "Images",
    video: "Video",
    unattached: "Unattached",
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">
            Media Library
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filteredMedia.length} of {media.length} files
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!bulkSelectMode && (
            <Button variant="outline" onClick={() => setBulkSelectMode(true)}>
              Bulk select
            </Button>
          )}

          <Button asChild>
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
        </div>
      </div>

      {/* Bulk Select Bar */}
      {bulkSelectMode && (
        <Card className="flex flex-row items-center gap-3 p-3">
          <Button
            onClick={createPostWithMedia}
            disabled={selectedIds.size === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Button>

          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || deleting}
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>

          <Button variant="outline" onClick={cancelBulkSelect}>
            Cancel
          </Button>

          <span className="ml-auto text-sm text-muted-foreground">{selectedIds.size} selected</span>

          <Button variant="link" size="sm" onClick={selectAll}>
            {selectedIds.size === filteredMedia.length ? "Deselect all" : "Select all"}
          </Button>
        </Card>
      )}

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FilterType)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All media items" />
          </SelectTrigger>
          <SelectContent>
            {(["all", "images", "video", "unattached"] as FilterType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {typeFilterLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px]">
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

      {/* Main Grid */}
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
        ) : uploading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Uploading & processing...</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 lg:py-20">
            <Upload className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">
              {media.length === 0
                ? "Drag & drop files here or click upload"
                : "No media matches your filters"}
            </p>
            <p className="text-xs text-muted-foreground">
              {media.length === 0 ? "Supports images and videos" : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (bulkSelectMode) {
                    toggleSelect(item.id);
                  } else {
                    setSelectedMediaId(item.id);
                  }
                }}
                className={`relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group transition-all ${
                  bulkSelectMode && selectedIds.has(item.id)
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-border hover:ring-foreground/30"
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
                    <Film className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* Bulk Select Checkbox */}
                {bulkSelectMode && (
                  <div className="absolute top-2 right-2 z-10">
                    {selectedIds.has(item.id) ? (
                      <CheckCircle2 className="w-6 h-6 text-primary fill-primary drop-shadow-md" />
                    ) : (
                      <Circle className="w-6 h-6 text-white/80 drop-shadow-md" />
                    )}
                  </div>
                )}

                {/* Three-dot menu - visible on hover when not in bulk mode */}
                {!bulkSelectMode && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageOptionsMenu
                      onEdit={() => setSelectedMediaId(item.id)}
                      onCopyUrl={() => copyToClipboard(item.url)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  </div>
                )}

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  {item.mime.startsWith("image/") ? (
                    <Image className="w-4 h-4 text-white drop-shadow-md" />
                  ) : (
                    <Film className="w-4 h-4 text-white drop-shadow-md" />
                  )}
                </div>

                {/* Unattached indicator */}
                {!usedMediaIds.has(item.id) && (
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-amber-500 rounded text-[10px] text-white font-medium">
                    Unused
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Detail Modal - shared component */}
      {!bulkSelectMode && (
        <MediaDetailModal
          mediaId={selectedMediaId}
          onClose={() => setSelectedMediaId(null)}
          onDelete={handleDelete}
          showDelete={true}
          onNavigate={handleNavigate}
          canNavigatePrev={canGoPrev}
          canNavigateNext={canGoNext}
        />
      )}
    </div>
  );
}
