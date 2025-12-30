"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Type,
  Image,
  Youtube,
  Quote,
  Minus,
  Upload,
  MoreVertical,
  Replace,
  ChevronLeft,
  Play,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CategoryInput } from "@/components/admin/category-input";
import { DatePicker } from "@/components/admin/date-picker";
import { UnsavedChangesModal } from "@/components/admin/unsaved-changes-modal";
import { MediaPicker } from "@/components/admin/media-picker";
import { GalleryBlockEditor } from "@/components/admin/gallery-block-editor";
import { cn } from "@/lib/utils";
import type { Block, Entry, GalleryBlock, MediaItem } from "@/lib/cms/types";

/**
 * Slugify text for URLs (matching server-side logic)
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

interface ArticleEditorFormProps {
  slug?: string; // If provided, edit mode. If not, create mode.
  onClose?: () => void; // For sheet/modal usage
  onSaved?: (entry: Entry) => void; // Callback after successful save
  isSheet?: boolean; // Whether rendered in a sheet
}

export function ArticleEditorForm({
  slug,
  onClose,
  onSaved,
  isSheet = false,
}: ArticleEditorFormProps) {
  const router = useRouter();
  const [currentSlug, setCurrentSlug] = useState<string | undefined>(slug);
  const isEditMode = !!slug || !!currentSlug;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [entry, setEntry] = useState<Entry | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSaved = useRef(false);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageId, setCoverImageId] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<MediaItem | null>(null);
  const [showCoverImagePicker, setShowCoverImagePicker] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  // Removed showBlockMenu state - using DropdownMenu instead
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [unpublishDialog, setUnpublishDialog] = useState(false);
  const [updatePublishDialog, setUpdatePublishDialog] = useState(false);
  const [galleryPickerBlockId, setGalleryPickerBlockId] = useState<
    string | null
  >(null);
  const [galleryMedia, setGalleryMedia] = useState<
    Record<string, MediaItem[]>
  >({});
  const [galleryReplaceIndex, setGalleryReplaceIndex] = useState<number | null>(
    null
  );

  // Block selection for multi-select delete
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());


  // Track initial values for dirty state
  const [initialTitle, setInitialTitle] = useState("");
  const [initialExcerpt, setInitialExcerpt] = useState("");
  const [initialCoverImageId, setInitialCoverImageId] = useState<string | null>(
    null
  );
  const [initialCategories, setInitialCategories] = useState<string[]>([]);
  const [initialTags, setInitialTags] = useState("");
  const [initialPublishDate, setInitialPublishDate] = useState<string | null>(
    null
  );
  const [initialBlocks, setInitialBlocks] = useState<string>("");

  // Check if form has been modified
  const isDirty = isEditMode
    ? title !== initialTitle ||
      excerpt !== initialExcerpt ||
      coverImageId !== initialCoverImageId ||
      JSON.stringify(categories.sort()) !==
        JSON.stringify(initialCategories.sort()) ||
      tags !== initialTags ||
      publishDate !== initialPublishDate ||
      JSON.stringify(blocks) !== initialBlocks
    : title.trim() !== "" ||
      excerpt.trim() !== "" ||
      coverImageId !== null ||
      categories.length > 0 ||
      tags.trim() !== "" ||
      publishDate !== null ||
      blocks.length > 0;

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
    // Save with current status (keep published entries published)
    const saveStatus = entry?.status === "published" ? "published" : "draft";
    await handleSave(saveStatus);
  };

  const handleCancelNavigation = () => {
    setShowUnsavedModal(false);
    setPendingNavUrl(null);
  };

  // Fetch entry data in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    async function fetchEntry() {
      try {
        const res = await fetch(
          `/api/admin/collections/articles/entries/${slug}`
        );
        if (!res.ok) {
          if (!isSheet) {
            router.push("/admin/content?collection=articles");
          }
          return;
        }
        const data = await res.json();
        const entry = data.data as Entry;
        setEntry(entry);

        const titleVal = (entry.data.title as string) || "";
        const excerptVal = (entry.data.excerpt as string) || "";
        const coverImageIdVal = (entry.data.coverImage as string) || null;
        const catsVal = (entry.data.categories as string[]) || [];
        const rawTags = entry.data.tags;
        const tagsVal = Array.isArray(rawTags)
          ? rawTags.join(", ")
          : (rawTags as string) || "";
        const dateVal = (entry.data.date as string) || null;
        const blocksVal = (entry.data.content as Block[]) || [];

        setTitle(titleVal);
        setExcerpt(excerptVal);
        setCoverImageId(coverImageIdVal);
        setCategories(catsVal);
        setTags(tagsVal);
        setPublishDate(dateVal);
        setBlocks(blocksVal);

        setInitialTitle(titleVal);
        setInitialExcerpt(excerptVal);
        setInitialCoverImageId(coverImageIdVal);
        setInitialCategories(catsVal);
        setInitialTags(tagsVal);
        setInitialPublishDate(dateVal);
        setInitialBlocks(JSON.stringify(blocksVal));

        // Load cover image if exists
        if (coverImageIdVal) {
          try {
            const mediaRes = await fetch(
              `/api/admin/media/${coverImageIdVal}`
            );
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              setCoverImage(mediaData.data);
            }
          } catch (err) {
            console.error("Failed to load cover image:", err);
          }
        }

        // Load gallery media for all gallery blocks
        const galleryBlocks = blocksVal.filter(
          (b) => b.type === "gallery"
        ) as Array<{ id: string; mediaIds: string[] }>;
        if (galleryBlocks.length > 0) {
          const galleryMediaMap: Record<string, MediaItem[]> = {};

          for (const block of galleryBlocks) {
            if (block.mediaIds && block.mediaIds.length > 0) {
              try {
                const mediaRes = await fetch(
                  `/api/admin/media/bulk?ids=${block.mediaIds.join(",")}`
                );
                if (mediaRes.ok) {
                  const mediaData = await mediaRes.json();
                  const fetchedMedia = mediaData.data || [];

                  // Ensure media is ordered according to block.mediaIds
                  const mediaMap = new Map(
                    fetchedMedia.map((m: MediaItem) => [m.id, m])
                  );
                  const orderedMedia = block.mediaIds
                    .map((id) => mediaMap.get(id))
                    .filter((m): m is MediaItem => m !== undefined);

                  galleryMediaMap[block.id] = orderedMedia;
                }
              } catch (err) {
                console.error(
                  `Failed to load media for gallery ${block.id}:`,
                  err
                );
              }
            }
          }

          setGalleryMedia(galleryMediaMap);
        }
      } catch (error) {
        console.error("Failed to fetch entry:", error);
        if (!isSheet) {
          router.push("/admin/content?collection=articles");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchEntry();
  }, [slug, router, isEditMode, isSheet]);

  const addBlock = (type: Block["type"]) => {
    const id = uuidv4();
    let newBlock: Block;

    switch (type) {
      case "text":
        newBlock = { type: "text", id, html: "" };
        break;
      case "gallery":
        newBlock = {
          type: "gallery",
          id,
          mediaIds: [],
          layout: "classic",
          gap: 16,
        };
        break;
      case "video":
        newBlock = { type: "video", id, mediaId: "", caption: "" };
        break;
      case "youtube":
        newBlock = { type: "youtube", id, url: "", caption: "" };
        break;
      case "quote":
        newBlock = { type: "quote", id, text: "", attribution: "" };
        break;
      case "divider":
        newBlock = { type: "divider", id };
        break;
      default:
        return;
    }

    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)) as Block[]
    );
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [
      newBlocks[newIndex],
      newBlocks[index],
    ];
    setBlocks(newBlocks);
  };

  // Delete selected blocks
  const deleteSelectedBlocks = () => {
    setBlocks(blocks.filter((b) => !selectedBlocks.has(b.id)));
    setSelectedBlocks(new Set());
  };

  // Toggle block selection
  const toggleBlockSelection = (id: string, checked: boolean) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSave = async (status: "draft" | "published") => {
    // Only validate required fields when publishing
    if (status === "published") {
      if (!title.trim()) {
        alert("Please enter a title to publish");
        return;
      }

      if (!coverImageId) {
        alert("Please select a cover image to publish");
        return;
      }

      if (categories.length === 0) {
        alert("Please select at least one category to publish");
        return;
      }

      if (blocks.length === 0) {
        alert("Please add at least one content block to publish");
        return;
      }
    }

    setSaving(true);

    try {
      const effectiveSlug = currentSlug || slug;
      const endpoint = effectiveSlug
        ? `/api/admin/collections/articles/entries/${effectiveSlug}`
        : "/api/admin/collections/articles/entries";

      // Regenerate slug from title for drafts (not yet published)
      let newSlug: string | undefined;
      if (effectiveSlug && entry?.status !== "published" && title.trim()) {
        const generatedSlug = slugify(title);
        if (generatedSlug && generatedSlug !== effectiveSlug) {
          newSlug = generatedSlug;
        }
      }

      const res = await fetch(endpoint, {
        method: effectiveSlug ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(newSlug && { slug: newSlug }),
          data: {
            title,
            excerpt: excerpt || "",
            coverImage: coverImageId,
            content: blocks,
            categories,
            tags: tags || "",
            date:
              publishDate || initialPublishDate || new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save article");
      }

      const data = await res.json();

      // Update state with saved entry
      setEntry(data.data);
      setInitialTitle(title);
      setInitialExcerpt(excerpt);
      setInitialCoverImageId(coverImageId);
      setInitialCategories([...categories]);
      setInitialTags(tags);
      setInitialPublishDate(publishDate);
      setInitialBlocks(JSON.stringify(blocks));

      if (data.data.slug) {
        setCurrentSlug(data.data.slug);
      }

      if (onSaved) {
        onSaved(data.data);
      }

      if (!isSheet) {
        setAllowNavigation(true);
        const savedSlug = data.data.slug;
        if (effectiveSlug && savedSlug !== effectiveSlug) {
          router.push(`/admin/content/articles/${savedSlug}`);
        } else if (!effectiveSlug) {
          router.push(`/admin/content/articles/${savedSlug}`);
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Failed to save article");
    } finally {
      setSaving(false);
      setPublishDialog(false);
      setUnpublishDialog(false);
      setUpdatePublishDialog(false);
    }
  };

  // Autosave function
  const autosave = useCallback(async () => {
    if (saving || autoSaving) return;
    if (entry?.status === "published") return;

    setAutoSaving(true);

    try {
      const effectiveSlug = currentSlug;
      const isCreating = !effectiveSlug;

      const endpoint = isCreating
        ? "/api/admin/collections/articles/entries"
        : `/api/admin/collections/articles/entries/${effectiveSlug}`;

      const res = await fetch(endpoint, {
        method: isCreating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "draft",
          data: {
            title: title || "Untitled",
            excerpt: excerpt || "",
            content: blocks,
            categories,
            tags: tags || "",
            date:
              publishDate || initialPublishDate || new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        hasAutoSaved.current = true;

        setEntry(data.data);
        setInitialTitle(title || "Untitled");
        setInitialExcerpt(excerpt);
        setInitialCategories([...categories]);
        setInitialTags(tags);
        setInitialPublishDate(publishDate);
        setInitialBlocks(JSON.stringify(blocks));

        if (isCreating && data.data?.slug) {
          setCurrentSlug(data.data.slug);
        }
      }
    } catch (error) {
      console.error("Autosave failed:", error);
    } finally {
      setAutoSaving(false);
    }
  }, [
    saving,
    autoSaving,
    entry?.status,
    currentSlug,
    title,
    excerpt,
    blocks,
    categories,
    tags,
    publishDate,
    initialPublishDate,
  ]);

  // Debounced autosave effect
  useEffect(() => {
    if (loading) return;
    if (entry?.status === "published") return;

    if (
      !currentSlug &&
      !title.trim() &&
      !excerpt.trim() &&
      categories.length === 0 &&
      blocks.length === 0
    ) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autosave();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    title,
    excerpt,
    categories,
    tags,
    publishDate,
    blocks,
    loading,
    entry?.status,
    currentSlug,
    autosave,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);


  const handleDelete = async () => {
    if (!isEditMode) return;

    setDeleting(true);

    try {
      const res = await fetch(
        `/api/admin/collections/articles/entries/${slug}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to delete article");
      }

      if (isSheet && onClose) {
        onClose();
        if (onSaved) {
          onSaved(null as unknown as Entry);
        }
      } else {
        router.push("/admin/content?collection=articles");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete article");
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
    }
  };

  const handleClose = useCallback(() => {
    if (entry?.status === "published" && isDirty && !allowNavigation) {
      setShowUnsavedModal(true);
      return;
    }
    onClose?.();
  }, [entry?.status, isDirty, allowNavigation, onClose]);

  // Preview function
  const handlePreview = () => {
    if (currentSlug) {
      window.open(`/article/${currentSlug}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b px-2 h-14 flex items-center">
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Get status display
  const getStatusPill = () => {
    const status = entry?.status || "draft";
    if (status === "published") {
      return (
        <span className="inline-flex items-center px-2 py-1 text-sm font-medium bg-emerald-100 text-black rounded-full">
          Published
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-sm font-medium bg-zinc-100 text-zinc-600 rounded-full">
        Draft
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Navigation Bar */}
      <div className="border-b border-zinc-200 px-2 h-14 flex items-center justify-between shrink-0">
        {/* Left: Close/Back button */}
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9"
          onClick={handleClose}
        >
          <ChevronLeft className="h-4 w-4 md:hidden" />
          <X className="h-4 w-4 hidden md:block" />
        </Button>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Preview button */}
          {currentSlug && (
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9"
              onClick={handlePreview}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}

          {/* Save status */}
          {entry?.status === "published" ? (
            <Button
              onClick={() => handleSave("published")}
              disabled={saving || !isDirty}
              variant="secondary"
              size="sm"
              className="h-9"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isDirty ? "Save" : "Saved"}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" className="h-9" disabled>
              {autoSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Saved"
              )}
            </Button>
          )}

          {/* Publish button */}
          <Button
            onClick={() => {
              if (isEditMode && entry?.status === "published") {
                if (isDirty) {
                  setUpdatePublishDialog(true);
                }
              } else {
                setPublishDialog(true);
              }
            }}
            disabled={
              saving ||
              (isEditMode && entry?.status === "published" && !isDirty)
            }
            size="sm"
            className="h-9"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish
          </Button>

          {/* More options menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {entry?.status === "published" && (
                <DropdownMenuItem onClick={() => setUnpublishDialog(true)}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Unpublish
                </DropdownMenuItem>
              )}
              {selectedBlocks.size > 0 && (
                <DropdownMenuItem
                  onClick={deleteSelectedBlocks}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete selected ({selectedBlocks.size})
                </DropdownMenuItem>
              )}
              {isEditMode && (
                <DropdownMenuItem
                  onClick={() => setDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete article
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title Row with Status */}
        <div className="px-4 h-14 flex items-center gap-2">
          <h1 className="text-xl font-bold font-[family-name:var(--font-syne)]">
            {isEditMode ? "Edit article" : "New article"}
          </h1>
          {getStatusPill()}
        </div>

        {/* Details Section */}
        <div className="px-4 space-y-3 pb-6">
          {/* Title field */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
              Title<span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="h-9"
            />
          </div>

          {/* Summary field */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
                Summary
              </label>
              <span className="text-sm text-zinc-500 font-[family-name:var(--font-syne)]">
                Optional
              </span>
            </div>
            <Input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary for previews"
              className="h-9"
            />
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
              Cover image
            </label>
            {coverImage ? (
              <div className="flex items-center gap-3 p-3 border border-zinc-200 rounded-md bg-white">
                {/* Thumbnail */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={coverImage.variants?.thumb?.url || coverImage.url}
                    alt={coverImage.alt || "Cover image"}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium font-[family-name:var(--font-syne)] text-zinc-700 truncate">
                    {coverImage.originalName}
                  </p>
                  <p className="text-sm text-zinc-500 font-[family-name:var(--font-syne)]">
                    {(coverImage.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>

                {/* Three-dot menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setShowCoverImagePicker(true)}
                    >
                      <Replace className="mr-2 h-4 w-4" />
                      Replace
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setCoverImageId(null);
                        setCoverImage(null);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCoverImagePicker(true)}
                className="w-full justify-start h-9"
              >
                <Upload className="mr-2 h-4 w-4" />
                Add Image
              </Button>
            )}
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
              Categories
            </label>
            <CategoryInput value={categories} onChange={setCategories} />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
              Date
            </label>
            <DatePicker
              value={publishDate}
              onChange={setPublishDate}
              placeholder="Select date"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
                Tags
              </label>
              <span className="text-sm text-zinc-500 font-[family-name:var(--font-syne)]">
                Optional
              </span>
            </div>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="design, photography, tutorial"
              className="h-9"
            />
            <p className="text-sm text-zinc-500 font-[family-name:var(--font-syne)]">
              Separate with commas
            </p>
          </div>
        </div>

        {/* Section Divider */}
        <div className="h-1 bg-zinc-200 my-0" />

        {/* Content Section */}
        <div className="px-4">
          {/* Content Section Header */}
          <div className="h-14 flex items-center justify-between">
            <h2 className="text-xl font-bold font-[family-name:var(--font-syne)]">
              Content
            </h2>
            <span className="text-sm text-zinc-500 font-[family-name:var(--font-syne)]">
              {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
            </span>
          </div>

          {/* Content Blocks */}
          <div className="space-y-0">
            {blocks.map((block, index) => (
              <BlockEditor
                key={block.id}
                block={block}
                index={index}
                total={blocks.length}
                selected={selectedBlocks.has(block.id)}
                onToggleSelect={(checked) =>
                  toggleBlockSelection(block.id, checked)
                }
                onUpdate={(updates) => {
                  updateBlock(block.id, updates);

                  // If this is a gallery block and mediaIds changed, sync galleryMedia state
                  if (
                    block.type === "gallery" &&
                    "mediaIds" in updates &&
                    updates.mediaIds
                  ) {
                    const newMediaIds = updates.mediaIds as string[];
                    setGalleryMedia((prev) => {
                      const currentMedia = prev[block.id] || [];
                      const newMedia = newMediaIds
                        .map((id) => currentMedia.find((m) => m.id === id))
                        .filter((m): m is MediaItem => m !== undefined);
                      return { ...prev, [block.id]: newMedia };
                    });
                  }
                }}
                onRemove={() => removeBlock(block.id)}
                onMove={(dir) => moveBlock(index, dir)}
                onOpenGalleryPicker={() => setGalleryPickerBlockId(block.id)}
                onReplaceGalleryImage={(imageIndex) => {
                  setGalleryPickerBlockId(block.id);
                  setGalleryReplaceIndex(imageIndex);
                }}
                galleryMedia={galleryMedia[block.id] || []}
              />
            ))}
          </div>

          {/* Add Block Button */}
          <div className="py-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full h-9"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add block
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem onClick={() => addBlock("text")}>
                  <Type className="mr-2 h-4 w-4" />
                  Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock("gallery")}>
                  <Image className="mr-2 h-4 w-4" />
                  Gallery
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock("youtube")}>
                  <Youtube className="mr-2 h-4 w-4" />
                  YouTube
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock("quote")}>
                  <Quote className="mr-2 h-4 w-4" />
                  Quote
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addBlock("divider")}>
                  <Minus className="mr-2 h-4 w-4" />
                  Divider
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

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

      {/* Gallery Media Picker */}
      <MediaPicker
        isOpen={!!galleryPickerBlockId}
        onClose={() => {
          setGalleryPickerBlockId(null);
          setGalleryReplaceIndex(null);
        }}
        onSelect={(items) => {
          if (galleryPickerBlockId && items.length > 0) {
            const block = blocks.find((b) => b.id === galleryPickerBlockId);
            if (block && block.type === "gallery") {
              if (galleryReplaceIndex !== null) {
                const newMediaIds = [...(block.mediaIds || [])];
                newMediaIds[galleryReplaceIndex] = items[0].id;
                updateBlock(galleryPickerBlockId, { mediaIds: newMediaIds });

                setGalleryMedia((prev) => {
                  const existingMedia = [
                    ...(prev[galleryPickerBlockId] || []),
                  ];
                  existingMedia[galleryReplaceIndex] = items[0];
                  return { ...prev, [galleryPickerBlockId]: existingMedia };
                });
              } else {
                const existingIds = block.mediaIds || [];
                const newIds = items.map((item) => item.id);
                updateBlock(galleryPickerBlockId, {
                  mediaIds: [...existingIds, ...newIds],
                });

                setGalleryMedia((prev) => ({
                  ...prev,
                  [galleryPickerBlockId]: [
                    ...(prev[galleryPickerBlockId] || []),
                    ...items,
                  ],
                }));
              }
            }
          }
          setGalleryPickerBlockId(null);
          setGalleryReplaceIndex(null);
        }}
        multiple={galleryReplaceIndex === null}
        accept={["image/*"]}
      />

      {/* Cover Image Picker */}
      <MediaPicker
        isOpen={showCoverImagePicker}
        onClose={() => setShowCoverImagePicker(false)}
        onSelect={(items) => {
          if (items.length > 0) {
            const selectedItem = items[0];
            setCoverImageId(selectedItem.id);
            setCoverImage(selectedItem);
          }
          setShowCoverImagePicker(false);
        }}
        multiple={false}
        accept={["image/*"]}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot
              be undone.
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
            <AlertDialogTitle>Publish article?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your article visible to all visitors on your site.
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
            <AlertDialogTitle>Unpublish article?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your article from the public site. It will be
              saved as a draft.
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

      {/* Update & Publish Confirmation Dialog */}
      <AlertDialog
        open={updatePublishDialog}
        onOpenChange={setUpdatePublishDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update & publish?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update your article and keep it published on your site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSave("published")}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update & Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


function BlockEditor({
  block,
  index,
  total,
  selected,
  onToggleSelect,
  onUpdate,
  onRemove,
  onMove,
  onOpenGalleryPicker,
  onReplaceGalleryImage,
  galleryMedia,
}: {
  block: Block;
  index: number;
  total: number;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onUpdate: (updates: Partial<Block>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onOpenGalleryPicker?: () => void;
  onReplaceGalleryImage?: (imageIndex: number) => void;
  galleryMedia?: MediaItem[];
}) {
  // Get icon for block type
  const getBlockIcon = () => {
    switch (block.type) {
      case "text":
        return <Type className="h-4 w-4 text-zinc-500" />;
      case "gallery":
        return <Image className="h-4 w-4 text-zinc-500" />;
      case "youtube":
        return <Youtube className="h-4 w-4 text-zinc-500" />;
      case "quote":
        return <Quote className="h-4 w-4 text-zinc-500" />;
      case "divider":
        return <Minus className="h-4 w-4 text-zinc-500" />;
      default:
        return null;
    }
  };

  // Get display name for block type
  const getBlockName = () => {
    switch (block.type) {
      case "text":
        return "Text";
      case "gallery":
        return "Gallery";
      case "youtube":
        return "YouTube";
      case "quote":
        return "Quote";
      case "divider":
        return "Divider";
      default:
        return block.type;
    }
  };

  return (
    <div className="border-b border-zinc-200">
      {/* Block Header */}
      <div className="flex items-center gap-2 py-3">
        {/* Checkbox */}
        <div className="flex items-center justify-center w-8 h-8">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onToggleSelect(checked === true)}
          />
        </div>

        {/* Block type icon and name */}
        <div className="flex-1 flex items-center gap-2">
          {getBlockIcon()}
          <span className="text-[15px] font-medium font-[family-name:var(--font-syne)]">
            {getBlockName()}
          </span>
        </div>

        {/* Move and delete buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove("up")}
            disabled={index === 0}
          >
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove("down")}
            disabled={index === total - 1}
          >
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRemove}
          >
            <X className="h-4 w-4 text-zinc-400" />
          </Button>
        </div>
      </div>

      {/* Block Content */}
      <div className="pb-6">
        {block.type === "text" && (
          <Textarea
            value={block.html}
            onChange={(e) => onUpdate({ html: e.target.value })}
            placeholder="Write your content here..."
            rows={4}
            className="resize-none text-[17px] font-[family-name:var(--font-syne)] leading-[1.5]"
          />
        )}

        {block.type === "youtube" && (
          <div className="space-y-3">
            <Input
              value={block.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="YouTube URL (e.g., https://youtube.com/watch?v=...)"
              className="h-9"
            />
            <Input
              value={block.caption || ""}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Caption (optional)"
              className="h-9"
            />
          </div>
        )}

        {block.type === "quote" && (
          <div className="space-y-3">
            <Textarea
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Quote text..."
              rows={2}
              className="resize-none italic"
            />
            <Input
              value={block.attribution || ""}
              onChange={(e) => onUpdate({ attribution: e.target.value })}
              placeholder="Attribution (optional)"
              className="h-9"
            />
          </div>
        )}

        {block.type === "divider" && (
          <div className="py-4">
            <hr className="border-zinc-200" />
          </div>
        )}

        {block.type === "gallery" && (
          <GalleryBlockEditor
            block={block as GalleryBlock}
            galleryMedia={galleryMedia || []}
            onUpdate={(updates) => onUpdate(updates)}
            onOpenGalleryPicker={onOpenGalleryPicker}
            onReplaceImage={onReplaceGalleryImage}
          />
        )}
      </div>
    </div>
  );
}
