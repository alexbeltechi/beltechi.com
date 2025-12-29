"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  GripVertical,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  ImageIcon,
  Star,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CategoryInput } from "@/components/admin/category-input";
import { DatePicker } from "@/components/admin/date-picker";
import { MediaPicker } from "@/components/admin/media-picker";
import { ImageOptionsMenu } from "@/components/admin/image-options-menu";
import { MediaDetailModal } from "@/components/admin/media-detail-modal";
import { UnsavedChangesModal } from "@/components/admin/unsaved-changes-modal";
import { IndexPill } from "@/components/lib";
import { cn } from "@/lib/utils";
import type { Entry, MediaItem } from "@/lib/cms/types";

interface MediaPreview {
  id: string;
  file?: File;
  url: string;
  type: "image" | "video";
  mediaId?: string;
  isExisting?: boolean;
}

const MAX_MEDIA = 20;

interface PostEditorFormProps {
  slug?: string; // If provided, edit mode. If not, create mode.
  onClose?: () => void; // For sheet/modal usage
  onSaved?: (entry: Entry) => void; // Callback after successful save
  isSheet?: boolean; // Whether rendered in a sheet
  preSelectedMediaIds?: string[]; // Pre-populate media from media library
}

export function PostEditorForm({
  slug,
  onClose,
  onSaved,
  isSheet = false,
  preSelectedMediaIds = [],
}: PostEditorFormProps) {
  const router = useRouter();
  const isEditMode = !!slug;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | undefined>(slug);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaPreview[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaDetailId, setMediaDetailId] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [showReplacePicker, setShowReplacePicker] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [unpublishDialog, setUnpublishDialog] = useState(false);
  const [updatePublishDialog, setUpdatePublishDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track initial values for dirty state
  const [initialTitle, setInitialTitle] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [initialCategories, setInitialCategories] = useState<string[]>([]);
  const [initialLocation, setInitialLocation] = useState("");
  const [initialTags, setInitialTags] = useState("");
  const [initialPublishDate, setInitialPublishDate] = useState<string | null>(null);
  const [initialMediaIds, setInitialMediaIds] = useState<string[]>([]);

  // Check if form has been modified
  const currentMediaIds = media.map((m) => m.mediaId || m.id);
  const isDirty = isEditMode
    ? title !== initialTitle ||
      description !== initialDescription ||
      JSON.stringify([...categories].sort()) !==
        JSON.stringify([...initialCategories].sort()) ||
      location !== initialLocation ||
      tags !== initialTags ||
      publishDate !== initialPublishDate ||
      JSON.stringify(currentMediaIds) !== JSON.stringify(initialMediaIds)
    : title.trim() !== "" ||
      description.trim() !== "" ||
      categories.length > 0 ||
      location.trim() !== "" ||
      tags.trim() !== "" ||
      publishDate !== null ||
      media.length > 0;

  const [allowNavigation, setAllowNavigation] = useState(false);

  // Warn before leaving page with unsaved changes (only when not in sheet mode)
  useEffect(() => {
    if (isSheet || !isDirty || allowNavigation) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

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
  }, [isDirty, allowNavigation, isSheet]);

  const handleDiscardChanges = () => {
    setAllowNavigation(true);
    setShowUnsavedModal(false);
    if (pendingNavUrl) {
      setTimeout(() => {
        window.location.href = pendingNavUrl;
      }, 0);
    }
  };

  const handleSaveAndNavigate = async () => {
    // Save with current status (keep published entries published, but don't push to live)
    const saveStatus = entry?.status === "published" ? "published" : "draft";
    await handleSave(saveStatus, false); // false = don't publish to live site
    setAllowNavigation(true);
    setShowUnsavedModal(false);
    if (pendingNavUrl) {
      setTimeout(() => {
        window.location.href = pendingNavUrl;
      }, 0);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedModal(false);
    setPendingNavUrl(null);
  };

  const handleMediaLibrarySelect = (items: MediaItem[]) => {
    const newMedia: MediaPreview[] = items.map((item) => ({
      id: Math.random().toString(36).slice(2),
      url: item.url,
      type: item.mime.startsWith("video/") ? "video" : "image",
      isExisting: true,
      mediaId: item.id,
    }));
    setMedia((prev) => [...prev, ...newMedia].slice(0, MAX_MEDIA));
  };

  const handleReplaceMedia = (index: number) => {
    setReplaceIndex(index);
    setShowReplacePicker(true);
  };

  const handleReplaceSelect = (items: MediaItem[]) => {
    if (items.length > 0 && replaceIndex !== null) {
      const newItem: MediaPreview = {
        id: Math.random().toString(36).slice(2),
        url: items[0].url,
        type: items[0].mime.startsWith("video/") ? "video" : "image",
        isExisting: true,
        mediaId: items[0].id,
      };

      setMedia((prev) => {
        const updated = [...prev];
        updated[replaceIndex] = newItem;
        return updated;
      });
    }
    setReplaceIndex(null);
    setShowReplacePicker(false);
  };

  // Fetch entry data in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    async function fetchEntry() {
      try {
        const res = await fetch(`/api/admin/collections/posts/entries/${slug}`);
        if (!res.ok) {
          if (!isSheet) {
            router.push("/admin/content?collection=posts");
          }
          return;
        }
        const data = await res.json();
        const entry = data.data as Entry;
        setEntry(entry);

        // For published entries, show pendingData (working copy) if it exists, otherwise show data
        const displayData = entry.status === "published" && entry.pendingData 
          ? entry.pendingData 
          : entry.data;

        const titleVal = (displayData.title as string) || "";
        const descVal = (displayData.description as string) || "";
        const catsVal = (displayData.categories as string[]) || [];
        const locVal = (displayData.location as string) || "";
        const rawTags = displayData.tags;
        const tagsVal = Array.isArray(rawTags)
          ? rawTags.join(", ")
          : (rawTags as string) || "";
        const dateVal = (displayData.date as string) || null;

        setTitle(titleVal);
        setDescription(descVal);
        setCategories(catsVal);
        setLocation(locVal);
        setTags(tagsVal);
        setPublishDate(dateVal);

        setInitialTitle(titleVal);
        setInitialDescription(descVal);
        setInitialCategories(catsVal);
        setInitialLocation(locVal);
        setInitialTags(tagsVal);
        setInitialPublishDate(dateVal);

        const mediaIds = (displayData.media as string[]) || [];

        if (mediaIds.length > 0) {
          const mediaRes = await fetch("/api/admin/media?limit=1000");
          const mediaData = await mediaRes.json();
          const allMedia = mediaData.data || [];

          const existingMedia: MediaPreview[] = mediaIds
            .map((id: string) => {
              const item = allMedia.find((m: { id: string }) => m.id === id);
              if (item) {
                return {
                  id: Math.random().toString(36).slice(2),
                  url: item.url,
                  type: item.mime.startsWith("video/") ? "video" : "image",
                  isExisting: true,
                  mediaId: item.id,
                } as MediaPreview;
              }
              return null;
            })
            .filter(Boolean) as MediaPreview[];

          setMedia(existingMedia);
          setInitialMediaIds(mediaIds);
        }
      } catch (error) {
        console.error("Failed to fetch entry:", error);
        if (!isSheet) {
          router.push("/admin/content?collection=posts");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchEntry();
  }, [slug, router, isEditMode, isSheet]);

  // Pre-populate media from query params (create mode with media selection)
  useEffect(() => {
    if (isEditMode || preSelectedMediaIds.length === 0) return;

    async function loadInitialMedia() {
      try {
        const mediaRes = await fetch("/api/admin/media?limit=1000");
        const mediaData = await mediaRes.json();
        const allMedia = mediaData.data || [];

        const existingMedia: MediaPreview[] = preSelectedMediaIds
          .map((id: string) => {
            const item = allMedia.find((m: { id: string }) => m.id === id);
            if (item) {
              return {
                id: Math.random().toString(36).slice(2),
                url: item.url,
                type: item.mime.startsWith("video/") ? "video" : "image",
                isExisting: true,
                mediaId: item.id,
              } as MediaPreview;
            }
            return null;
          })
          .filter(Boolean) as MediaPreview[];

        if (existingMedia.length > 0) {
          setMedia(existingMedia);
        }
      } catch (error) {
        console.error("Failed to load initial media:", error);
      }
    }

    loadInitialMedia();
  }, [preSelectedMediaIds, isEditMode]);

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newMedia: MediaPreview[] = fileArray.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setMedia((prev) => [...prev, ...newMedia].slice(0, MAX_MEDIA));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
      e.target.value = "";
    }
  };

  const removeMedia = (id: string) => {
    setMedia(media.filter((m) => m.id !== id));
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
    setMedia(newMedia);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // publish: true = push changes to live site, false = save as working copy
  const handleSave = async (status: "draft" | "published", publish: boolean = true) => {
    // Only validate required fields when actually publishing to live site
    if (publish && status === "published") {
      if (media.length === 0) {
        alert("Please add at least one image or video to publish");
        return;
      }

      if (categories.length === 0) {
        alert("Please select at least one category to publish");
        return;
      }
    }

    setSaving(true);

    try {
      const mediaIds: string[] = [];

      for (const item of media) {
        if (item.isExisting && item.mediaId) {
          mediaIds.push(item.mediaId);
        } else if (item.file) {
          const formData = new FormData();
          formData.append("file", item.file);

          const uploadRes = await fetch("/api/admin/media", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            const errorData = await uploadRes.json();
            throw new Error(errorData.error || "Failed to upload media");
          }

          const uploadData = await uploadRes.json();
          mediaIds.push(uploadData.data.id);
        }
      }

      const coverMediaId = mediaIds[0]; // First image is always the cover

      const endpoint = isEditMode
        ? `/api/admin/collections/posts/entries/${slug}`
        : "/api/admin/collections/posts/entries";

      const res = await fetch(endpoint, {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          publish, // Tell API whether to push to live site
          data: {
            title: title || "",
            description: description || "",
            media: mediaIds,
            coverMediaId,
            categories,
            location: location || "",
            tags: tags || "",
            date: publishDate || new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save post");
      }

      const data = await res.json();

      if (isEditMode) {
        setEntry(data.data);
        setInitialTitle(title);
        setInitialDescription(description);
        setInitialCategories([...categories]);
        setInitialLocation(location);
        setInitialTags(tags);
        setInitialPublishDate(publishDate);
        setInitialMediaIds(mediaIds);
      }

      if (onSaved) {
        onSaved(data.data);
      }

      // Don't close the dialog after save - user can continue editing
      // Only update URL if not in sheet mode and slug changed
      if (!isSheet) {
        setAllowNavigation(true);
        if (isEditMode && data.data.slug !== slug) {
          router.push(`/admin/content/posts/${data.data.slug}`);
        } else if (!isEditMode) {
          router.push(`/admin/content/posts/${data.data.slug}`);
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Failed to save post");
    } finally {
      setSaving(false);
      setPublishDialog(false);
      setUnpublishDialog(false);
      setUpdatePublishDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/collections/posts/entries/${slug}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete post");
      }

      if (isSheet && onClose) {
        onClose();
        if (onSaved) {
          // Trigger a refresh
          onSaved(null as unknown as Entry);
        }
      } else {
        router.push("/admin/content?collection=posts");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete post");
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
    }
  };

  const handleClose = useCallback(() => {
    // For published entries, check for unsaved changes
    // For drafts, changes are autosaved so just close
    if (entry?.status === "published" && isDirty && !allowNavigation) {
      setShowUnsavedModal(true);
      return;
    }
    onClose?.();
  }, [entry?.status, isDirty, allowNavigation, onClose]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b px-4 h-14 flex items-center">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 border-b">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="px-4 py-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {isSheet && onClose && (
            <button
              onClick={handleClose}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">
              {isEditMode ? "Edit Post" : "New Post"}
            </h1>
            {isEditMode && entry && (
              <Badge
                variant={entry.status === "published" ? "default" : "outline"}
                className={cn(
                  entry.status === "published" &&
                    "bg-emerald-500 hover:bg-emerald-600"
                )}
              >
                {entry.status}
              </Badge>
            )}
            {!isEditMode && (
              <Badge variant="outline">Draft</Badge>
            )}
          </div>
        </div>

        {/* Manual save button - secondary style */}
        <Button
          onClick={() => {
            // For published entries, save to pendingData (not live)
            // For drafts, save as draft
            const status = entry?.status === "published" ? "published" : "draft";
            const publish = false; // Never publish from this button
            handleSave(status, publish);
          }}
          disabled={saving || !isDirty}
          variant="secondary"
          size="sm"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Media Upload */}
        <div className="px-4 py-4 border-b">
          <Label className="text-base font-medium">
            Media <span className="text-destructive">*</span>
          </Label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
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
              "mt-3 text-center transition-all",
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
                  {isDraggingFiles
                    ? "Drop files here"
                    : "Drag & drop files here"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Images and videos (up to {MAX_MEDIA})
                </p>
                <div className="flex items-center justify-center gap-3">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMediaPicker(true);
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
                      onClick={(e) => {
                        // Only open modal if clicking directly on the image or video element
                        const target = e.target as HTMLElement;
                        const isImageOrVideo = target.tagName === 'IMG' || target.tagName === 'VIDEO';
                        
                        if (!isImageOrVideo) {
                          return;
                        }
                        
                        // Open modal when clicking on the image
                        if (item.isExisting && item.mediaId) {
                          setMediaDetailId(item.mediaId);
                        }
                      }}
                      className={cn(
                        "relative aspect-square bg-muted rounded-lg overflow-hidden group cursor-pointer ring-1 ring-transparent hover:ring-primary transition-all",
                        draggedIndex === index && "opacity-50 scale-95"
                      )}
                    >
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                        />
                      )}

                      <div className="absolute bottom-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="p-1.5 bg-black/60 rounded-full">
                          <GripVertical className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      <div 
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      >
                        <ImageOptionsMenu
                          onEdit={
                            item.isExisting && item.mediaId
                              ? () => {
                                  setMediaDetailId(item.mediaId!);
                                }
                              : undefined
                          }
                          onCopyUrl={() => {
                            navigator.clipboard.writeText(item.url);
                          }}
                          onReplace={() => {
                            handleReplaceMedia(index);
                          }}
                          onDelete={() => {
                            removeMedia(item.id);
                          }}
                          isCover={false}
                          showCoverOption={false}
                        />
                      </div>

                      <IndexPill
                        index={index + 1}
                        className="absolute top-2 left-2"
                      />

                      {index === 0 && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-amber-500 rounded-full text-[10px] text-white font-medium">
                          <Star className="h-3 w-3 fill-white" />
                          Cover
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Drag to reorder · {media.length}/{MAX_MEDIA} files
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
                    onClick={() => setShowMediaPicker(true)}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Library
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
              Title{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a caption..."
              rows={3}
            />
          </div>

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
            placeholder="Select date"
          />

          <div className="space-y-2">
            <Label htmlFor="location">
              Location{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="travel, portrait, landscape"
            />
            <p className="text-xs text-muted-foreground">Separate with commas</p>
          </div>

          <Separator />

          {/* Publish Button */}
          <Button
            onClick={() => {
              if (isEditMode && entry?.status === "published") {
                setUpdatePublishDialog(true);
              } else {
                setPublishDialog(true);
              }
            }}
            disabled={saving || (isEditMode && entry?.status === "published" && !isDirty)}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {isEditMode
              ? entry?.status === "published"
                ? isDirty
                  ? "Update & Publish"
                  : "Published"
                : "Publish Post"
              : "Publish Post"}
          </Button>

          {/* Unpublish & Delete Buttons */}
          {isEditMode && (
            <div className="flex items-center justify-between pt-2">
              {entry?.status === "published" && (
                <Button
                  onClick={() => setUnpublishDialog(true)}
                  disabled={saving}
                  variant="ghost"
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  Unpublish
                </Button>
              )}
              <div className={entry?.status !== "published" ? "ml-auto" : ""}>
                <Button
                  onClick={() => setDeleteDialog(true)}
                  disabled={deleting}
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaLibrarySelect}
        multiple={true}
        maxSelect={MAX_MEDIA - media.length}
        accept={["image/*", "video/*"]}
      />

      {/* Replace Media Picker */}
      <MediaPicker
        isOpen={showReplacePicker}
        onClose={() => {
          setShowReplacePicker(false);
          setReplaceIndex(null);
        }}
        onSelect={handleReplaceSelect}
        multiple={false}
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
        onDiscard={() => {
          handleDiscardChanges();
          if (isSheet && onClose) {
            onClose();
          }
        }}
        onSave={handleSaveAndNavigate}
        onCancel={handleCancelNavigation}
        isSaving={saving}
        isPublished={entry?.status === "published"}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={publishDialog} onOpenChange={setPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your post visible to all visitors on your site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSave("published", true)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unpublish Confirmation Dialog */}
      <AlertDialog open={unpublishDialog} onOpenChange={setUnpublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your post from the public site. It will be saved
              as a draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSave("draft", true)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update & Publish Confirmation Dialog */}
      <AlertDialog
        open={updatePublishDialog}
        onOpenChange={setUpdatePublishDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update & publish?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update your post and keep it published on your site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSave("published", true)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update & Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

