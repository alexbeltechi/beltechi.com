"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
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
import type { Block, Entry } from "@/lib/cms/types";
import { CategoryInput } from "@/components/admin/category-input";
import { DatePicker } from "@/components/admin/date-picker";
import { UnsavedChangesModal } from "@/components/admin/unsaved-changes-modal";

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
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

  // Track initial values for dirty state
  const [initialTitle, setInitialTitle] = useState("");
  const [initialExcerpt, setInitialExcerpt] = useState("");
  const [initialCategories, setInitialCategories] = useState<string[]>([]);
  const [initialTags, setInitialTags] = useState("");
  const [initialPublishDate, setInitialPublishDate] = useState<string | null>(null);
  const [initialBlocks, setInitialBlocks] = useState<string>("");

  // Check if form has been modified
  const isDirty =
    title !== initialTitle ||
    excerpt !== initialExcerpt ||
    JSON.stringify(categories.sort()) !== JSON.stringify(initialCategories.sort()) ||
    tags !== initialTags ||
    publishDate !== initialPublishDate ||
    JSON.stringify(blocks) !== initialBlocks;

  // Track if we're allowing navigation (after discard or successful save)
  const [allowNavigation, setAllowNavigation] = useState(false);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!isDirty || allowNavigation) return;

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
  }, [isDirty, allowNavigation]);

  // Handle unsaved changes modal actions
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
    // Keep current status if published, otherwise save as draft
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

  // Fetch entry data
  useEffect(() => {
    async function fetchEntry() {
      try {
        const res = await fetch(`/api/admin/collections/articles/entries/${slug}`);
        if (!res.ok) {
          router.push("/admin/content?collection=articles");
          return;
        }
        const data = await res.json();
        const entry = data.data as Entry;
        setEntry(entry);

        // Populate form fields
        const titleVal = (entry.data.title as string) || "";
        const excerptVal = (entry.data.excerpt as string) || "";
        const catsVal = (entry.data.categories as string[]) || [];
        // Handle both old (string) and new (array) tag formats
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

        // Store initial values for dirty checking
        setInitialTitle(titleVal);
        setInitialExcerpt(excerptVal);
        setInitialCategories(catsVal);
        setInitialTags(tagsVal);
        setInitialPublishDate(dateVal);
        setInitialBlocks(JSON.stringify(blocksVal));
      } catch (error) {
        console.error("Failed to fetch entry:", error);
        router.push("/admin/content?collection=articles");
      } finally {
        setLoading(false);
      }
    }

    fetchEntry();
  }, [slug, router]);

  const addBlock = (type: Block["type"]) => {
    const id = uuidv4();
    let newBlock: Block;

    switch (type) {
      case "text":
        newBlock = { type: "text", id, html: "" };
        break;
      case "image":
        newBlock = { type: "image", id, mediaId: "", caption: "" };
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

    // Confirm before publishing
    if (status === "published" && entry?.status !== "published") {
      if (!confirm("Are you sure you want to publish this article?")) {
        return;
      }
    }

    // Confirm before unpublishing
    if (status === "draft" && entry?.status === "published") {
      if (!confirm("Are you sure you want to unpublish this article? It will no longer be visible on the site.")) {
        return;
      }
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/collections/articles/entries/${slug}`, {
        method: "PATCH",
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
        throw new Error(error.error || "Failed to update article");
      }

      const data = await res.json();
      
      // Update local state with the new entry data
      setEntry(data.data);
      
      // If slug changed, redirect
      if (data.data.slug !== slug) {
        router.push(`/admin/content/articles/${data.data.slug}`);
      }
      
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this article? This cannot be undone.")) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/collections/articles/entries/${slug}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete article");
      }

      router.push("/admin/content?collection=articles");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete article");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!entry) {
    return null;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/content?collection=articles"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Articles
          </Link>
          <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">
            Edit Article
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Status:{" "}
            <span
              className={
                entry.status === "published"
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            >
              {entry.status}
            </span>
          </p>
        </div>

        <button
          onClick={() => handleSave("draft")}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 text-zinc-700"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>

      {/* Title & Excerpt */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 lg:p-6 space-y-4 shadow-sm">
        <div>
          <label className="block text-sm font-semibold mb-2 text-zinc-900">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-zinc-900 placeholder:text-zinc-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-zinc-900">
            Excerpt{" "}
            <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Brief summary for previews..."
            rows={2}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white resize-none text-zinc-900 placeholder:text-zinc-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900">
              Categories <span className="text-red-500">*</span>
            </label>
            <CategoryInput value={categories} onChange={setCategories} />
          </div>

          <div>
            <DatePicker
              label="Date"
              value={publishDate}
              onChange={setPublishDate}
              placeholder="Select date"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-zinc-900">
            Tags <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="photography, editing, tutorial"
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-zinc-900 placeholder:text-zinc-400"
          />
          <p className="text-xs text-zinc-500 mt-1">Separate with commas</p>
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-zinc-900">
            Content <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-zinc-500">{blocks.length} blocks</span>
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
            />
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowBlockMenu(!showBlockMenu)}
            className="w-full p-4 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors flex items-center justify-center gap-2 bg-zinc-50"
          >
            <Plus className="w-5 h-5" />
            Add Block
          </button>

          {showBlockMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white border border-zinc-200 rounded-xl shadow-lg z-10 grid grid-cols-3 sm:grid-cols-4 gap-2">
              <BlockTypeButton
                icon={Type}
                label="Text"
                onClick={() => addBlock("text")}
              />
              <BlockTypeButton
                icon={Image}
                label="Image"
                onClick={() => addBlock("image")}
              />
              <BlockTypeButton
                icon={Image}
                label="Gallery"
                onClick={() => addBlock("gallery")}
              />
              <BlockTypeButton
                icon={Film}
                label="Video"
                onClick={() => addBlock("video")}
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

      {/* Action buttons */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 lg:p-6 shadow-sm space-y-4">
        {/* Publish Button - Full Width Black */}
        <button
          onClick={() => handleSave("published")}
          disabled={saving}
          style={{ backgroundColor: "#18181b", color: "#ffffff" }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          {entry.status === "published" ? "Update & Publish" : "Publish Article"}
        </button>

        {/* Unpublish & Delete Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
          {entry.status === "published" && (
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              Unpublish
            </button>
          )}
          <div className={entry.status !== "published" ? "ml-auto" : ""}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </button>
          </div>
        </div>
      </div>

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
      className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-zinc-100 transition-colors"
    >
      <Icon className="w-5 h-5 text-zinc-500" />
      <span className="text-xs text-zinc-600">{label}</span>
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
}: {
  block: Block;
  index: number;
  total: number;
  onUpdate: (updates: Partial<Block>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden group shadow-sm">
      <div className="flex items-center justify-between px-3 lg:px-4 py-2 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-zinc-400 cursor-grab" />
          <span className="text-xs text-zinc-500 capitalize font-medium">
            {block.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="p-1.5 hover:bg-zinc-200 rounded disabled:opacity-30 text-zinc-600"
          >
            ↑
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className="p-1.5 hover:bg-zinc-200 rounded disabled:opacity-30 text-zinc-600"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 hover:bg-red-100 text-red-500 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 lg:p-4">
        {block.type === "text" && (
          <textarea
            value={block.html}
            onChange={(e) => onUpdate({ html: e.target.value })}
            placeholder="Write your content here... (HTML supported)"
            rows={4}
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white resize-none text-zinc-900 placeholder:text-zinc-400"
          />
        )}

        {block.type === "image" && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-video border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-zinc-300 bg-zinc-100 hover:border-zinc-400"
              }`}
            >
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                <span className="text-sm text-zinc-500">
                  {isDragging ? "Drop image here" : "Click or drag to upload"}
                </span>
              </div>
            </div>
            <input
              type="text"
              value={block.caption || ""}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Caption (optional)"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        )}

        {block.type === "youtube" && (
          <div className="space-y-3">
            <input
              type="text"
              value={block.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="YouTube URL (e.g., https://youtube.com/watch?v=...)"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-zinc-900 placeholder:text-zinc-400"
            />
            <input
              type="text"
              value={block.caption || ""}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Caption (optional)"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-zinc-900 placeholder:text-zinc-400"
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
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white resize-none italic text-zinc-900 placeholder:text-zinc-400"
            />
            <input
              type="text"
              value={block.attribution || ""}
              onChange={(e) => onUpdate({ attribution: e.target.value })}
              placeholder="Attribution (optional)"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        )}

        {block.type === "divider" && (
          <div className="py-4">
            <hr className="border-zinc-300" />
          </div>
        )}

        {block.type === "gallery" && (
          <div
            className="text-center py-8 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:border-zinc-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
            <p className="text-zinc-500 text-sm">
              Click or drag to upload multiple images
            </p>
          </div>
        )}

        {block.type === "video" && (
          <div
            className="text-center py-8 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:border-zinc-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
            <p className="text-zinc-500 text-sm">Click or drag to upload video</p>
          </div>
        )}
      </div>
    </div>
  );
}

