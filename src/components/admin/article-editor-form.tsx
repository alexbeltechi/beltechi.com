"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  GripVertical,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Type,
  Image,
  Film,
  Youtube,
  Quote,
  Minus,
  Upload,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
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
import { UnsavedChangesModal } from "@/components/admin/unsaved-changes-modal";
import { MediaPicker } from "@/components/admin/media-picker";
import { cn } from "@/lib/utils";
import type { Block, Entry, MediaItem } from "@/lib/cms/types";

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
  const isEditMode = !!slug;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [entry, setEntry] = useState<Entry | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [unpublishDialog, setUnpublishDialog] = useState(false);
  const [updatePublishDialog, setUpdatePublishDialog] = useState(false);
  const [galleryPickerBlockId, setGalleryPickerBlockId] = useState<string | null>(null);
  const [galleryMedia, setGalleryMedia] = useState<Record<string, MediaItem[]>>({});

  // Track initial values for dirty state
  const [initialTitle, setInitialTitle] = useState("");
  const [initialExcerpt, setInitialExcerpt] = useState("");
  const [initialCategories, setInitialCategories] = useState<string[]>([]);
  const [initialTags, setInitialTags] = useState("");
  const [initialPublishDate, setInitialPublishDate] = useState<string | null>(null);
  const [initialBlocks, setInitialBlocks] = useState<string>("");

  // Check if form has been modified
  const isDirty = isEditMode
    ? title !== initialTitle ||
      excerpt !== initialExcerpt ||
      JSON.stringify(categories.sort()) !== JSON.stringify(initialCategories.sort()) ||
      tags !== initialTags ||
      publishDate !== initialPublishDate ||
      JSON.stringify(blocks) !== initialBlocks
    : title.trim() !== "" ||
      excerpt.trim() !== "" ||
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
        const res = await fetch(`/api/admin/collections/articles/entries/${slug}`);
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
        const catsVal = (entry.data.categories as string[]) || [];
        const rawTags = entry.data.tags;
        const tagsVal = Array.isArray(rawTags)
          ? rawTags.join(", ")
          : (rawTags as string) || "";
        const dateVal = (entry.data.date as string) || null;
        const blocksVal = (entry.data.content as Block[]) || [];

        setTitle(titleVal);
        setExcerpt(excerptVal);
        setCategories(catsVal);
        setTags(tagsVal);
        setPublishDate(dateVal);
        setBlocks(blocksVal);

        setInitialTitle(titleVal);
        setInitialExcerpt(excerptVal);
        setInitialCategories(catsVal);
        setInitialTags(tagsVal);
        setInitialPublishDate(dateVal);
        setInitialBlocks(JSON.stringify(blocksVal));
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
        newBlock = { type: "gallery", id, mediaIds: [], columns: 2 };
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
    setShowBlockMenu(false);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)) as Block[]
    );
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
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

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (categories.length === 0) {
      alert("Please select at least one category");
      return;
    }

    if (blocks.length === 0) {
      alert("Please add at least one content block");
      return;
    }

    setSaving(true);

    try {
      const endpoint = isEditMode
        ? `/api/admin/collections/articles/entries/${slug}`
        : "/api/admin/collections/articles/entries";

      const res = await fetch(endpoint, {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          data: {
            title,
            excerpt: excerpt || undefined,
            content: blocks,
            categories,
            tags: tags || undefined,
            date: publishDate || new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save article");
      }

      const data = await res.json();

      if (isEditMode) {
        setEntry(data.data);
        setInitialTitle(title);
        setInitialExcerpt(excerpt);
        setInitialCategories([...categories]);
        setInitialTags(tags);
        setInitialPublishDate(publishDate);
        setInitialBlocks(JSON.stringify(blocks));
      }

      if (onSaved) {
        onSaved(data.data);
      }

      if (isSheet && onClose) {
        onClose();
      } else if (!isSheet) {
        setAllowNavigation(true);
        if (isEditMode && data.data.slug !== slug) {
          router.push(`/admin/content/articles/${data.data.slug}`);
        } else if (!isEditMode) {
          router.push(`/admin/content/articles/${data.data.slug}`);
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

  const handleDelete = async () => {
    if (!isEditMode) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/collections/articles/entries/${slug}`, {
        method: "DELETE",
      });

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
    if (isDirty && !allowNavigation) {
      setShowUnsavedModal(true);
      return;
    }
    onClose?.();
  }, [isDirty, allowNavigation, onClose]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b px-4 h-14 flex items-center">
          <Skeleton className="h-4 w-32" />
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
              {isEditMode ? "Edit Article" : "New Article"}
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
            {!isEditMode && <Badge variant="outline">Draft</Badge>}
          </div>
        </div>

        <Button
          onClick={() =>
            handleSave(entry?.status === "published" ? "published" : "draft")
          }
          disabled={saving || (isEditMode && !isDirty)}
          variant="outline"
          size="sm"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isEditMode ? (isDirty ? "Save" : "Saved") : "Save Draft"}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="text-lg font-medium"
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt">
              Excerpt{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary for previews..."
              rows={2}
            />
          </div>

          {/* Categories & Date */}
          <div className="grid grid-cols-1 gap-4">
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

          {/* Tags */}
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
              placeholder="photography, editing, tutorial"
            />
            <p className="text-xs text-muted-foreground">Separate with commas</p>
          </div>

          <Separator />

          {/* Content Blocks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>
                Content <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {blocks.length} blocks
              </span>
            </div>

            <div className="space-y-3">
              {blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={index}
                  total={blocks.length}
                  onUpdate={(updates) => updateBlock(block.id, updates)}
                  onRemove={() => removeBlock(block.id)}
                  onMove={(dir) => moveBlock(index, dir)}
                  onOpenGalleryPicker={() => setGalleryPickerBlockId(block.id)}
                  galleryMedia={galleryMedia[block.id] || []}
                />
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowBlockMenu(!showBlockMenu)}
                className="w-full p-4 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 bg-muted/50"
              >
                <Plus className="w-5 h-5" />
                Add Block
              </button>

              {showBlockMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-background border border-border rounded-lg shadow-lg z-10 grid grid-cols-3 gap-2">
                  <BlockTypeButton
                    icon={Type}
                    label="Text"
                    onClick={() => addBlock("text")}
                  />
                  <BlockTypeButton
                    icon={Image}
                    label="Gallery"
                    onClick={() => addBlock("gallery")}
                  />
                  <BlockTypeButton
                    icon={Youtube}
                    label="YouTube"
                    onClick={() => addBlock("youtube")}
                  />
                  <BlockTypeButton
                    icon={Quote}
                    label="Quote"
                    onClick={() => addBlock("quote")}
                  />
                  <BlockTypeButton
                    icon={Minus}
                    label="Divider"
                    onClick={() => addBlock("divider")}
                  />
                </div>
              )}
            </div>
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
                : "Publish Article"
              : "Publish Article"}
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
      />

      {/* Gallery Media Picker */}
      <MediaPicker
        isOpen={!!galleryPickerBlockId}
        onClose={() => setGalleryPickerBlockId(null)}
        onSelect={(items) => {
          if (galleryPickerBlockId) {
            // Update the gallery media state
            setGalleryMedia((prev) => ({
              ...prev,
              [galleryPickerBlockId]: [...(prev[galleryPickerBlockId] || []), ...items],
            }));
            // Update the block's mediaIds
            const block = blocks.find((b) => b.id === galleryPickerBlockId);
            if (block && block.type === "gallery") {
              const existingIds = block.mediaIds || [];
              const newIds = items.map((item) => item.id);
              updateBlock(galleryPickerBlockId, { mediaIds: [...existingIds, ...newIds] });
            }
          }
          setGalleryPickerBlockId(null);
        }}
        multiple={true}
        accept={["image/*"]}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot be
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
              This will remove your article from the public site. It will be saved
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

function BlockTypeButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-muted transition-colors"
    >
      <Icon className="w-5 h-5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}

function BlockEditor({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  onOpenGalleryPicker,
  galleryMedia,
}: {
  block: Block;
  index: number;
  total: number;
  onUpdate: (updates: Partial<Block>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onOpenGalleryPicker?: () => void;
  galleryMedia?: MediaItem[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden group shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
          <span className="text-xs text-muted-foreground capitalize font-medium">
            {block.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="p-1.5 hover:bg-muted rounded disabled:opacity-30 text-muted-foreground"
          >
            ↑
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className="p-1.5 hover:bg-muted rounded disabled:opacity-30 text-muted-foreground"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 hover:bg-destructive/10 text-destructive rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3">
        {block.type === "text" && (
          <textarea
            value={block.html}
            onChange={(e) => onUpdate({ html: e.target.value })}
            placeholder="Write your content here... (HTML supported)"
            rows={4}
            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background resize-none"
          />
        )}

        {block.type === "youtube" && (
          <div className="space-y-3">
            <Input
              value={block.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="YouTube URL (e.g., https://youtube.com/watch?v=...)"
            />
            <Input
              value={block.caption || ""}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Caption (optional)"
            />
          </div>
        )}

        {block.type === "quote" && (
          <div className="space-y-3">
            <textarea
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Quote text..."
              rows={2}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background resize-none italic"
            />
            <Input
              value={block.attribution || ""}
              onChange={(e) => onUpdate({ attribution: e.target.value })}
              placeholder="Attribution (optional)"
            />
          </div>
        )}

        {block.type === "divider" && (
          <div className="py-4">
            <hr className="border-border" />
          </div>
        )}

        {block.type === "gallery" && (
          <div className="space-y-3">
            {galleryMedia && galleryMedia.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {galleryMedia.map((item) => (
                    <div key={item.id} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                      <img
                        src={item.variants?.thumb?.url || item.url}
                        alt={item.alt || ""}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onOpenGalleryPicker}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md hover:border-muted-foreground transition-colors"
                >
                  + Add more images
                </button>
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
        )}

        {block.type === "video" && (
          <div
            className="text-center py-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-muted-foreground transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Click or drag to upload video
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

