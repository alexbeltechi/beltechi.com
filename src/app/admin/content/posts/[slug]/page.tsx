"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  GripVertical,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  ImageIcon,
  Star,
} from "lucide-react";
import { CategoryInput } from "@/components/admin/category-input";
import { DatePicker } from "@/components/admin/date-picker";
import { MediaPicker } from "@/components/admin/media-picker";
import { ImageOptionsMenu } from "@/components/admin/image-options-menu";
import { MediaDetailModal } from "@/components/admin/media-detail-modal";
import { UnsavedChangesModal } from "@/components/admin/unsaved-changes-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [entry, setEntry] = useState<Entry | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaPreview[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaDetailId, setMediaDetailId] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [unpublishDialog, setUnpublishDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setAsCover = (index: number) => {
    setCoverIndex(index);
  };

  // Track initial values for dirty state
  const [initialTitle, setInitialTitle] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [initialCategories, setInitialCategories] = useState<string[]>([]);
  const [initialLocation, setInitialLocation] = useState("");
  const [initialTags, setInitialTags] = useState("");
  const [initialPublishDate, setInitialPublishDate] = useState<string | null>(
    null
  );
  const [initialMediaIds, setInitialMediaIds] = useState<string[]>([]);
  const [initialCoverIndex, setInitialCoverIndex] = useState<number>(0);

  // Check if form has been modified
  // Note: media IDs are NOT sorted to detect order changes
  const currentMediaIds = media.map((m) => m.mediaId || m.id);
  const isDirty =
    title !== initialTitle ||
    description !== initialDescription ||
    JSON.stringify([...categories].sort()) !==
      JSON.stringify([...initialCategories].sort()) ||
    location !== initialLocation ||
    tags !== initialTags ||
    publishDate !== initialPublishDate ||
    JSON.stringify(currentMediaIds) !== JSON.stringify(initialMediaIds) ||
    coverIndex !== initialCoverIndex;

  const [allowNavigation, setAllowNavigation] = useState(false);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!isDirty || allowNavigation) return;

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
  }, [isDirty, allowNavigation]);

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
    const saveStatus = entry?.status === "published" ? "published" : "draft";
    await handleSave(saveStatus);
    setShowUnsavedModal(false);
    if (pendingNavUrl) {
      window.location.href = pendingNavUrl;
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
    setMedia((prev) => [...prev, ...newMedia].slice(0, 10));
  };

  // Fetch entry data
  useEffect(() => {
    async function fetchEntry() {
      try {
        const res = await fetch(
          `/api/admin/collections/posts/entries/${slug}`
        );
        if (!res.ok) {
          router.push("/admin/content?collection=posts");
          return;
        }
        const data = await res.json();
        const entry = data.data as Entry;
        setEntry(entry);

        const titleVal = (entry.data.title as string) || "";
        const descVal = (entry.data.description as string) || "";
        const catsVal = (entry.data.categories as string[]) || [];
        const locVal = (entry.data.location as string) || "";
        const rawTags = entry.data.tags;
        const tagsVal = Array.isArray(rawTags)
          ? rawTags.join(", ")
          : (rawTags as string) || "";
        const dateVal = (entry.data.date as string) || null;

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

        const mediaIds = (entry.data.media as string[]) || [];
        const coverMediaId = entry.data.coverMediaId as string | undefined;

        if (mediaIds.length > 0) {
          const mediaRes = await fetch("/api/admin/media");
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

          const foundCoverIndex = coverMediaId
            ? mediaIds.findIndex((id: string) => id === coverMediaId)
            : 0;
          const coverIdx = foundCoverIndex >= 0 ? foundCoverIndex : 0;
          setCoverIndex(coverIdx);
          setInitialCoverIndex(coverIdx);
        }
      } catch (error) {
        console.error("Failed to fetch entry:", error);
        router.push("/admin/content?collection=posts");
      } finally {
        setLoading(false);
      }
    }

    fetchEntry();
  }, [slug, router]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
      e.target.value = "";
    }
  };

  const removeMedia = (id: string) => {
    const removedIndex = media.findIndex((m) => m.id === id);
    setMedia(media.filter((m) => m.id !== id));

    if (removedIndex !== -1) {
      if (removedIndex === coverIndex) {
        setCoverIndex(0);
      } else if (removedIndex < coverIndex) {
        setCoverIndex(coverIndex - 1);
      }
    }
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

    if (draggedIndex === coverIndex) {
      setCoverIndex(index);
    } else if (draggedIndex < coverIndex && index >= coverIndex) {
      setCoverIndex(coverIndex - 1);
    } else if (draggedIndex > coverIndex && index <= coverIndex) {
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

    if (categories.length === 0) {
      alert("Please select at least one category");
      return;
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
            throw new Error("Failed to upload media");
          }

          const uploadData = await uploadRes.json();
          mediaIds.push(uploadData.data.id);
        }
      }

      const coverMediaId = mediaIds[coverIndex] || mediaIds[0];

      const res = await fetch(`/api/admin/collections/posts/entries/${slug}`, {
        method: "PATCH",
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
        throw new Error(error.error || "Failed to update post");
      }

      const data = await res.json();

      setEntry(data.data);

      setInitialTitle(title);
      setInitialDescription(description);
      setInitialCategories([...categories]);
      setInitialLocation(location);
      setInitialTags(tags);
      setInitialPublishDate(publishDate);
      setInitialMediaIds(mediaIds);
      setInitialCoverIndex(coverIndex);

      if (data.data.slug !== slug) {
        router.push(`/admin/content/posts/${data.data.slug}`);
      }

      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Failed to save post");
    } finally {
      setSaving(false);
      setPublishDialog(false);
      setUnpublishDialog(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/collections/posts/entries/${slug}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete post");
      }

      router.push("/admin/content?collection=posts");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete post");
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!entry) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/content?collection=posts"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Posts
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Edit Post</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge
              variant={entry.status === "published" ? "default" : "outline"}
              className={cn(
                entry.status === "published" &&
                  "bg-emerald-500 hover:bg-emerald-600"
              )}
            >
              {entry.status}
            </Badge>
          </div>
        </div>

        <Button
          onClick={() =>
            handleSave(entry.status === "published" ? "published" : "draft")
          }
          disabled={saving || !isDirty}
          variant="outline"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isDirty ? "Save Changes" : "No Changes"}
        </Button>
      </div>

      {/* Media Upload */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold">
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
              "mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-all",
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                        setMediaDetailId(item.mediaId)
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
                              ? () => setMediaDetailId(item.mediaId!)
                              : undefined
                          }
                          onCopyUrl={() =>
                            navigator.clipboard.writeText(item.url)
                          }
                          onSetCover={() => setAsCover(index)}
                          onDelete={() => removeMedia(item.id)}
                          isCover={index === coverIndex}
                          showCoverOption={true}
                        />
                      </div>

                      <div className="absolute top-2 left-2 w-6 h-6 bg-black/80 rounded-full flex items-center justify-center text-xs text-white font-medium">
                        {index + 1}
                      </div>

                      {index === coverIndex && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-amber-500 rounded-full text-[10px] text-white font-medium">
                          <Star className="h-3 w-3 fill-white" />
                          Cover
                        </div>
                      )}
                    </div>
                  ))}

                  {media.length < 10 && (
                    <div className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 bg-muted/50">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload files"
                      >
                        <Upload className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowMediaPicker(true)}
                        title="Choose from library"
                      >
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Drag to reorder · {media.length}/10 files
                </p>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload more
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
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
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="pt-6 space-y-4">
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
              placeholder="Select date"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <p className="text-xs text-muted-foreground">
                Separate with commas
              </p>
            </div>
          </div>

          <Separator />

          {/* Publish Button */}
          <Button
            onClick={() => {
              if (entry.status === "published") {
                handleSave("published");
              } else {
                setPublishDialog(true);
              }
            }}
            disabled={saving || (entry.status === "published" && !isDirty)}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {entry.status === "published"
              ? isDirty
                ? "Update & Publish"
                : "No Changes"
              : "Publish Post"}
          </Button>

          {/* Unpublish & Delete Buttons */}
          <div className="flex items-center justify-between pt-2">
            {entry.status === "published" && (
              <Button
                onClick={() => setUnpublishDialog(true)}
                disabled={saving}
                variant="ghost"
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <EyeOff className="mr-2 h-4 w-4" />
                )}
                Unpublish
              </Button>
            )}
            <div className={entry.status !== "published" ? "ml-auto" : ""}>
              <Button
                onClick={() => setDeleteDialog(true)}
                disabled={deleting}
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaLibrarySelect}
        multiple={true}
        maxSelect={10 - media.length}
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
            <AlertDialogAction onClick={() => handleSave("published")}>
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
            <AlertDialogAction onClick={() => handleSave("draft")}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
