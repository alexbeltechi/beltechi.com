"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  GripVertical,
  Save,
  Eye,
  Loader2,
  ImageIcon,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CategoryInput } from "@/components/admin/category-input";
import { DatePicker } from "@/components/admin/date-picker";
import { MediaPicker } from "@/components/admin/media-picker";
import { ImageOptionsMenu } from "@/components/admin/image-options-menu";
import { MediaDetailModal } from "@/components/admin/media-detail-modal";
import { UnsavedChangesModal } from "@/components/admin/unsaved-changes-modal";
import { IndexPill } from "@/components/lib";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/cms/types";

interface MediaPreview {
  id: string;
  file?: File;
  url: string;
  type: "image" | "video";
  isExisting?: boolean; // true if from media library
  mediaId?: string; // original media ID if from library
}

function NewPostPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaPreview[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0); // Track which image is the cover
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaDetailId, setMediaDetailId] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [initialMediaLoaded, setInitialMediaLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load media from URL params (when coming from media library)
  useEffect(() => {
    const mediaParam = searchParams.get("media");
    if (mediaParam && !initialMediaLoaded) {
      setInitialMediaLoaded(true);
      const mediaIds = mediaParam.split(",").filter(Boolean);
      
      // Fetch all media items and filter by the IDs
      fetch("/api/admin/media")
        .then((res) => res.json())
        .then((data) => {
          const allMedia: MediaItem[] = data.data || [];
          const selectedMedia = mediaIds
            .map((id) => allMedia.find((m) => m.id === id))
            .filter((m): m is MediaItem => m !== undefined);
          
          const previews: MediaPreview[] = selectedMedia.map((item) => ({
            id: `existing-${item.id}`,
            url: item.variants?.thumb?.url || item.url,
            type: item.mime.startsWith("video/") ? "video" : "image",
            isExisting: true,
            mediaId: item.id,
          }));
          
          setMedia(previews);
        })
        .catch((err) => {
          console.error("Failed to load media from params:", err);
        });
    }
  }, [searchParams, initialMediaLoaded]);

  // Check if form has any content (for unsaved changes warning)
  const hasContent =
    title.trim() !== "" ||
    description.trim() !== "" ||
    categories.length > 0 ||
    location.trim() !== "" ||
    tags.trim() !== "" ||
    publishDate !== null ||
    media.length > 0;

  // Track if we're allowing navigation (after discard or successful save)
  const [allowNavigation, setAllowNavigation] = useState(false);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!hasContent || allowNavigation) return;

    // Browser navigation (close tab, refresh, external URL)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    // Client-side navigation (clicking links)
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPendingNavUrl(link.href);
        setShowUnsavedModal(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [hasContent, allowNavigation]);

  // Handle unsaved changes modal actions
  const handleDiscardChanges = () => {
    // Allow navigation by disabling the warning
    setAllowNavigation(true);
    setShowUnsavedModal(false);
    if (pendingNavUrl) {
      // Small delay to ensure state update removes listeners before navigation
      setTimeout(() => {
        window.location.href = pendingNavUrl;
      }, 0);
    }
  };

  const handleSaveAndNavigate = async () => {
    await handleSave("draft");
    // Note: handleSave navigates on success, but if it fails we stay
  };

  const handleCancelNavigation = () => {
    setShowUnsavedModal(false);
    setPendingNavUrl(null);
  };

  // Set which image is the cover (without moving it)
  const setAsCover = (index: number) => {
    setCoverIndex(index);
  };

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newMedia: MediaPreview[] = fileArray.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setMedia((prev) => [...prev, ...newMedia].slice(0, 10));
  };

  const handleMediaLibrarySelect = (items: MediaItem[]) => {
    const newMedia: MediaPreview[] = items.map((item) => ({
      id: Math.random().toString(36).slice(2),
      url: item.url,
      type: item.mime.startsWith("video/") ? "video" : "image",
      isExisting: true,
      mediaId: item.id,
    }));
    setMedia((prev) => [...prev, ...newMedia].slice(0, 10));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
      // Reset the input so the same files can be selected again
      e.target.value = "";
    }
  };

  const removeMedia = (id: string) => {
    const removedIndex = media.findIndex((m) => m.id === id);
    setMedia(media.filter((m) => m.id !== id));
    
    // Adjust cover index if needed
    if (removedIndex !== -1) {
      if (removedIndex === coverIndex) {
        // Removed the cover, reset to first
        setCoverIndex(0);
      } else if (removedIndex < coverIndex) {
        // Removed an item before cover, adjust index
        setCoverIndex(coverIndex - 1);
      }
    }
  };

  // Drag and drop for file upload
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

  // Drag and drop for reordering
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
    setMedia(newMedia);
    
    // Adjust cover index when items are reordered
    if (draggedIndex === coverIndex) {
      // The cover was dragged, update to new position
      setCoverIndex(index);
    } else if (draggedIndex < coverIndex && index >= coverIndex) {
      // Dragged from before cover to after cover
      setCoverIndex(coverIndex - 1);
    } else if (draggedIndex > coverIndex && index <= coverIndex) {
      // Dragged from after cover to before cover
      setCoverIndex(coverIndex + 1);
    }
    
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async (status: "draft" | "published") => {
    if (media.length === 0) {
      alert("Please add at least one image or video");
      return;
    }

    // Title and category are required only for publishing
    if (status === "published") {
      if (!title.trim()) {
        alert("Please add a title to publish");
        return;
      }
      if (categories.length === 0) {
        alert("Please select at least one category to publish");
        return;
      }
      if (!confirm("Are you sure you want to publish this post?")) {
        return;
      }
    }

    setSaving(true);

    try {
      // Collect media IDs - upload new files, use existing IDs for library items
      const mediaIds: string[] = [];

      for (const item of media) {
        if (item.isExisting && item.mediaId) {
          // Already in library, use existing ID
          mediaIds.push(item.mediaId);
        } else if (item.file) {
          // New file, needs upload
          const formData = new FormData();
          formData.append("file", item.file);

          const uploadRes = await fetch("/api/admin/media", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            throw new Error("Failed to upload media");
          }

          const uploadData = await uploadRes.json();
          mediaIds.push(uploadData.data.id);
        }
      }

      // Determine cover media ID (use the media at coverIndex)
      const coverMediaId = mediaIds[coverIndex] || mediaIds[0];

      // Create the post entry
      const res = await fetch("/api/admin/collections/posts/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          data: {
            title: title || undefined,
            description: description || undefined,
            media: mediaIds,
            coverMediaId,
            categories,
            location: location || undefined,
            tags: tags || undefined,
            date: publishDate || new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create post");
      }

      const data = await res.json();
      router.push(`/admin/content/posts/${data.data.slug}`);
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - 56px top bar */}
      <div className="border-b px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/content?collection=posts"
            className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">New Post</h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSave("draft")}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Draft
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Media Upload */}
        <div className="px-4 py-4 border-b">
          <h2 className="text-xl font-medium">
            Media <span className="text-destructive">*</span>
          </h2>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleFileDragOver}
            onDragEnter={handleFileDragOver}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
            onClick={() => media.length === 0 && fileInputRef.current?.click()}
            className={cn(
              "mt-4 text-center transition-all",
              media.length === 0 && "border border-dashed rounded-lg p-8",
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
                  {isDraggingFiles
                    ? "Drop files here"
                    : "Drag & drop files here"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Images and videos (up to 10)
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMediaPicker(true);
                    }}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Choose from Library
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Media Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {media.map((item, index) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => item.isExisting && item.mediaId && setMediaDetailId(item.mediaId)}
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

                      {/* Drag handle - bottom right, always visible on mobile, hover on desktop */}
                      <div className="absolute bottom-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="p-1.5 bg-black/60 rounded-full">
                          <GripVertical className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      {/* Three-dot menu - top right, visible on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageOptionsMenu
                          onEdit={item.isExisting && item.mediaId ? () => setMediaDetailId(item.mediaId!) : undefined}
                          onCopyUrl={() => navigator.clipboard.writeText(item.url)}
                          onSetCover={() => setAsCover(index)}
                          onDelete={() => removeMedia(item.id)}
                          isCover={index === coverIndex}
                          showCoverOption={true}
                        />
                      </div>

                      {/* Order badge - top left */}
                      <IndexPill index={index + 1} className="absolute top-2 left-2" />

                      {/* Cover indicator - bottom left */}
                      {index === coverIndex && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-amber-500 rounded-full text-[10px] text-white font-medium">
                          <Star className="h-3 w-3 fill-white" />
                          Cover
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Drag to reorder · {media.length}/10 files
                </p>
                
                {/* Additional buttons below grid */}
                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload more
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMediaPicker(true)}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Choose from library
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a caption..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Categories <span className="text-destructive">*</span>
              </Label>
              <CategoryInput value={categories} onChange={setCategories} />
            </div>

            <DatePicker
              label="Date"
              value={publishDate}
              onChange={setPublishDate}
              placeholder="Select date (defaults to now)"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">
                Location{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">
                Tags{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="travel, portrait, landscape"
              />
              <p className="text-xs text-muted-foreground">Separate with commas</p>
            </div>
          </div>

          <Separator />

          {/* Publish Button - Full Width */}
          <Button
            onClick={() => handleSave("published")}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Publish Post
          </Button>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaLibrarySelect}
        multiple={true}
        maxSelect={20 - media.length}
        accept={["image/*", "video/*"]}
      />

      {/* Media Detail Modal */}
      <MediaDetailModal
        mediaId={mediaDetailId}
        onClose={() => setMediaDetailId(null)}
        showDelete={false}
      />

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onDiscard={handleDiscardChanges}
        onSave={handleSaveAndNavigate}
        onCancel={handleCancelNavigation}
        isSaving={saving}
      />
    </div>
  );
}

export default function NewPostPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <NewPostPageContent />
    </Suspense>
  );
}
