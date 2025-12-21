"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Monitor,
  Smartphone,
  Settings,
  ChevronDown,
  ChevronUp,
  Save,
  Eye,
  Loader2,
  ArrowLeft,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PageBlock, PageBlockType, PageData } from "@/lib/cms/page-blocks";
import { blockDefaults, blockLabels, createBlock, generateBlockId } from "@/lib/cms/page-blocks";
import { spacingOptions, type SpacingKey } from "@/lib/design-tokens";
import { BlockEditor } from "./block-editor";
import { BlockPreview } from "./block-preview";

// ============================================
// Types
// ============================================

interface PageEditorProps {
  initialData?: PageData;
  isNew?: boolean;
}

type ViewMode = "desktop" | "mobile";
type SaveStatus = "saved" | "saving" | "unsaved" | "error";

// ============================================
// Page Editor Component
// ============================================

export function PageEditor({ initialData, isNew = false }: PageEditorProps) {
  const router = useRouter();
  
  // Page data state
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [blocks, setBlocks] = useState<PageBlock[]>(initialData?.blocks || []);
  const [settings, setSettings] = useState(initialData?.settings || {
    maxWidth: "default" as const,
    topPadding: "lg" as SpacingKey,
    bottomPadding: "lg" as SpacingKey,
  });
  
  // Editor state
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(isNew ? "unsaved" : "saved");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [currentSlug, setCurrentSlug] = useState(initialData?.slug || "");
  
  // Refs for autosave
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  // Auto-generate slug from title
  const generateSlug = useCallback((text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }, []);

  // Autosave function
  const performAutosave = useCallback(async () => {
    // Don't autosave if no title (required field)
    if (!title.trim()) return;
    
    // For new pages, we need at least a title before first save
    if (isNew && !currentSlug) {
      // First save for new page - save as draft
      setSaveStatus("saving");
      try {
        const pageData: PageData = {
          title,
          slug: slug || generateSlug(title),
          description,
          blocks,
          settings,
        };

        const res = await fetch("/api/admin/collections/pages/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: pageData, status: "draft" }),
        });

        if (!res.ok) throw new Error("Failed to save");
        
        const data = await res.json();
        setCurrentSlug(data.data?.slug || slug);
        setSaveStatus("saved");
        
        // Update URL without full navigation
        window.history.replaceState(null, "", `/admin/pages/${data.data?.slug || slug}`);
      } catch {
        setSaveStatus("error");
      }
      return;
    }

    // Existing page - update
    if (currentSlug) {
      setSaveStatus("saving");
      try {
        const pageData: PageData = {
          title,
          slug: slug || generateSlug(title),
          description,
          blocks,
          settings,
        };

        const res = await fetch(`/api/admin/collections/pages/entries/${currentSlug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: pageData }),
        });

        if (!res.ok) throw new Error("Failed to save");
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }
  }, [title, slug, description, blocks, settings, currentSlug, isNew, generateSlug]);

  // Autosave effect - triggers 2 seconds after changes
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Mark as unsaved when content changes
    if (saveStatus === "saved") {
      setSaveStatus("unsaved");
    }

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new autosave timer (2 seconds after last change)
    autosaveTimerRef.current = setTimeout(() => {
      performAutosave();
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [title, slug, description, blocks, settings]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (isNew && !currentSlug) {
      setSlug(generateSlug(value));
    }
  };

  // Block operations
  const addBlock = (type: PageBlockType) => {
    const newBlock = createBlock(type);
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<PageBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } as PageBlock : b)));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (block) {
      const newBlock = { ...block, id: generateBlockId() };
      const index = blocks.findIndex((b) => b.id === id);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);
    }
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    setBlocks(newBlocks);
  };

  // Copy/paste using localStorage
  const copyBlock = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (block) {
      localStorage.setItem("beltechi_clipboard", JSON.stringify({
        type: "block",
        data: block,
        timestamp: Date.now(),
      }));
    }
  };

  const pasteBlock = () => {
    try {
      const raw = localStorage.getItem("beltechi_clipboard");
      if (!raw) return;
      const { type, data } = JSON.parse(raw);
      if (type !== "block") return;
      const newBlock = { ...data, id: generateBlockId() };
      setBlocks([...blocks, newBlock]);
      setSelectedBlockId(newBlock.id);
    } catch {
      // Invalid clipboard data
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    moveBlock(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Save page (manual save / publish)
  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      alert("Please enter a page title");
      return;
    }

    setSaveStatus("saving");
    try {
      const pageData: PageData = {
        title,
        slug: slug || generateSlug(title),
        description,
        blocks,
        settings,
      };

      const endpoint = currentSlug
        ? `/api/admin/collections/pages/entries/${currentSlug}`
        : "/api/admin/collections/pages/entries";

      const method = currentSlug ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: pageData,
          status,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save page");
      }

      const data = await res.json();
      const newSlug = data.data?.slug || slug;
      setCurrentSlug(newSlug);
      setSaveStatus("saved");
      
      // Update URL if slug changed
      if (!currentSlug || currentSlug !== newSlug) {
        window.history.replaceState(null, "", `/admin/pages/${newSlug}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
      alert(error instanceof Error ? error.message : "Failed to save page");
    }
  };

  // Selected block
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 h-14 flex items-center gap-4 shrink-0">
        {/* Back button */}
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/pages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        {/* Title input */}
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Page title..."
          className="max-w-xs font-medium border-0 px-0 focus-visible:ring-0 text-lg"
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex items-center border rounded-lg p-1">
          <Button
            variant={viewMode === "desktop" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode("desktop")}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "mobile" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode("mobile")}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        {/* Settings button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Save status / dropdown */}
        {saveStatus === "saved" ? (
          <Button variant="ghost" disabled className="text-muted-foreground">
            <Check className="mr-2 h-4 w-4" />
            Saved
          </Button>
        ) : saveStatus === "saving" ? (
          <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={saveStatus === "error" ? "destructive" : "default"}>
                <Save className="mr-2 h-4 w-4" />
                {saveStatus === "error" ? "Retry Save" : "Save"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSave("draft")}>
                Save as Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSave("published")}>
                <Eye className="mr-2 h-4 w-4" />
                Publish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview area */}
        <div className="flex-1 bg-muted/30 overflow-y-auto p-4">
          <div
            className={cn(
              "mx-auto bg-background rounded-lg shadow-sm border min-h-full transition-all",
              viewMode === "mobile" ? "max-w-[375px]" : "max-w-4xl"
            )}
          >
            {/* Block list */}
            <div className="p-6">
              {blocks.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-muted-foreground mb-4">
                    Start building your page
                  </p>
                  <AddBlockButton onAdd={addBlock} />
                </div>
              ) : (
                <div className="space-y-2">
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedBlockId(block.id)}
                      className={cn(
                        "group relative rounded-lg border-2 border-transparent transition-all cursor-pointer",
                        selectedBlockId === block.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "hover:border-muted-foreground/30",
                        draggedIndex === index && "opacity-50"
                      )}
                    >
                      {/* Block toolbar */}
                      <div
                        className={cn(
                          "absolute -top-3 left-2 flex items-center gap-1 bg-background border rounded-md px-1 py-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10",
                          selectedBlockId === block.id && "opacity-100"
                        )}
                      >
                        <button className="p-1 hover:bg-muted rounded cursor-grab">
                          <GripVertical className="h-3 w-3" />
                        </button>
                        <span className="px-1 font-medium">
                          {blockLabels[block.type]?.label || block.type}
                        </span>
                        <button
                          className="p-1 hover:bg-muted rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyBlock(block.id);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 hover:bg-muted rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateBlock(block.id);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBlock(block.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Block preview */}
                      <div className="p-4">
                        <BlockPreview
                          block={block}
                          isMobile={viewMode === "mobile"}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add block button at bottom */}
                  <div className="pt-4 flex justify-center">
                    <AddBlockButton onAdd={addBlock} onPaste={pasteBlock} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar - Block settings (always visible, full height) */}
        <div className="w-80 border-l bg-background overflow-y-auto shrink-0 flex flex-col">
          {selectedBlock ? (
            <>
              <div className="p-4 border-b shrink-0">
                <h3 className="font-medium">
                  {blockLabels[selectedBlock.type]?.label || "Block"} Settings
                </h3>
              </div>
              <div className="p-4 flex-1">
                <BlockEditor
                  block={selectedBlock}
                  onChange={(updates) => updateBlock(selectedBlock.id, updates)}
                  isMobile={viewMode === "mobile"}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-muted-foreground text-sm text-center">
                Select a block to edit its settings
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Page Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Page Settings</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 py-6">
            {/* Slug */}
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(generateSlug(e.target.value))}
                  placeholder="page-url"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description for SEO..."
                rows={3}
              />
            </div>

            {/* Max Width */}
            <div className="space-y-2">
              <Label>Content Width</Label>
              <Select
                value={settings.maxWidth}
                onValueChange={(v) =>
                  setSettings({ ...settings, maxWidth: v as typeof settings.maxWidth })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow (768px)</SelectItem>
                  <SelectItem value="default">Default (1024px)</SelectItem>
                  <SelectItem value="wide">Wide (1280px)</SelectItem>
                  <SelectItem value="full">Full Width</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Top Padding */}
            <div className="space-y-2">
              <Label>Top Padding</Label>
              <Select
                value={settings.topPadding}
                onValueChange={(v) =>
                  setSettings({ ...settings, topPadding: v as SpacingKey })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {spacingOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bottom Padding */}
            <div className="space-y-2">
              <Label>Bottom Padding</Label>
              <Select
                value={settings.bottomPadding}
                onValueChange={(v) =>
                  setSettings({ ...settings, bottomPadding: v as SpacingKey })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {spacingOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================
// Add Block Button
// ============================================

interface AddBlockButtonProps {
  onAdd: (type: PageBlockType) => void;
  onPaste?: () => void;
}

function AddBlockButton({ onAdd, onPaste }: AddBlockButtonProps) {
  const blockTypes: PageBlockType[] = [
    "hero",
    "text",
    "image",
    "gallery",
    "divider",
    "quote",
    "video",
    "button",
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        {blockTypes.map((type) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
            <span className="font-medium">{blockLabels[type]?.label}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {blockLabels[type]?.description?.slice(0, 20)}...
            </span>
          </DropdownMenuItem>
        ))}
        {onPaste && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPaste}>
              Paste Block
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default PageEditor;

