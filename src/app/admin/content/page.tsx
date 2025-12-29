"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  FileText,
  Image,
  Film,
  MoreVertical,
  Pencil,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PageHeader,
  ListRow,
  ListRowContent,
  ListRowCheckbox,
  ListRowActions,
  TypePill,
  StatusPill,
} from "@/components/lib";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { ArticleEditorForm } from "@/components/admin/article-editor-form";
import type { Entry, MediaItem } from "@/lib/cms/types";
import { toast } from "sonner";

// Constants
const ITEMS_PER_PAGE = 20;

type ContentFilter = "all" | "posts" | "articles";
type SortOption = "newest" | "oldest" | "name-asc" | "name-desc";

function ContentListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const urlTab = searchParams.get("tab") as ContentFilter | null;
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const urlEdit = searchParams.get("edit"); // e.g., "posts/luciana"

  // Local state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, MediaItem>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<ContentFilter>(urlTab || "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(urlPage);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Mobile filter modal
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Sheet state for desktop editing
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<"post" | "article" | null>(null);

  // Check if we're on desktop (lg breakpoint = 1024px)
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [postsRes, articlesRes, mediaRes] = await Promise.all([
        fetch("/api/admin/collections/posts/entries"),
        fetch("/api/admin/collections/articles/entries"),
        fetch("/api/admin/media?limit=1000"), // Fetch all media for thumbnail lookup
      ]);

      const postsData = await postsRes.json();
      const articlesData = await articlesRes.json();
      const mediaData = await mediaRes.json();

      const allEntries = [
        ...(postsData.data || []),
        ...(articlesData.data || []),
      ].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setEntries(allEntries);

      const map: Record<string, MediaItem> = {};
      (mediaData.data || []).forEach((item: MediaItem) => {
        map[item.id] = item;
      });
      setMediaMap(map);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync with URL params
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ContentFilter | null;
    const pageParam = parseInt(searchParams.get("page") || "1", 10);

    if (tabParam && tabParam !== typeFilter) {
      setTypeFilter(tabParam);
    } else if (!tabParam && typeFilter !== "all") {
      setTypeFilter("all");
    }

    if (pageParam !== currentPage) {
      setCurrentPage(pageParam);
    }
  }, [searchParams]);

  // Handle edit param from URL - open sheet when URL has ?edit=posts/slug
  useEffect(() => {
    if (!isDesktop || loading) return;
    
    const editParam = searchParams.get("edit");
    
    if (editParam) {
      const [collection, slug] = editParam.split("/");
      
      if (slug === "new") {
        // Creating new entry
        if (collection === "posts" && isCreatingNew !== "post") {
          setIsCreatingNew("post");
          setEditingEntry(null);
          setSheetOpen(true);
        } else if (collection === "articles" && isCreatingNew !== "article") {
          setIsCreatingNew("article");
          setEditingEntry(null);
          setSheetOpen(true);
        }
      } else {
        // Editing existing entry
        const entry = entries.find(
          (e) => e.collection === collection && e.slug === slug
        );
        if (entry && editingEntry?.slug !== slug) {
          setEditingEntry(entry);
          setIsCreatingNew(null);
          setSheetOpen(true);
        }
      }
    } else if (sheetOpen && !editParam) {
      // URL no longer has edit param, close the sheet
      setSheetOpen(false);
      setEditingEntry(null);
      setIsCreatingNew(null);
    }
  }, [searchParams, entries, isDesktop, loading]);

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      // Type filter
      if (typeFilter === "posts" && entry.collection !== "posts") return false;
      if (typeFilter === "articles" && entry.collection !== "articles")
        return false;

      // Status filter
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = ((entry.data.title as string) || "").toLowerCase();
        const description = (
          (entry.data.description as string) ||
          (entry.data.excerpt as string) ||
          ""
        ).toLowerCase();
        if (!title.includes(query) && !description.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        case "oldest":
          return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
        case "name-asc":
          return ((a.data.title as string) || "").localeCompare((b.data.title as string) || "");
        case "name-desc":
          return ((b.data.title as string) || "").localeCompare((a.data.title as string) || "");
        default:
          return 0;
      }
    });
  }, [entries, typeFilter, statusFilter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEntries, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(1);
      updateURL({ page: "1" });
    }
  }, [filteredEntries.length]);

  // Update URL helper
  const updateURL = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "all" || value === "1") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const newUrl = params.toString()
      ? `?${params.toString()}`
      : "/admin/content";
    router.push(newUrl, { scroll: false });
  };

  // Get thumbnail data for an entry (returns URL and whether it's a video without poster)
  const getThumbnailData = (entry: Entry): { url: string | null; isVideoWithoutPoster: boolean } => {
    let mediaItem: MediaItem | undefined;
    
    if (entry.collection === "posts") {
      const media = entry.data.media as string[];
      if (media && media.length > 0) {
        mediaItem = mediaMap[media[0]];
      }
    } else if (entry.collection === "articles") {
      // Articles use coverImage field
      const coverImage = entry.data.coverImage as string | undefined;
      if (coverImage) {
        mediaItem = mediaMap[coverImage];
      }
    }

    if (!mediaItem) {
      return { url: null, isVideoWithoutPoster: false };
    }

    // Check if it's a video
    const isVideo = mediaItem.mime.startsWith("video/");
    
    if (isVideo) {
      // Use poster if available
      if (mediaItem.poster?.url) {
        return { url: mediaItem.poster.url, isVideoWithoutPoster: false };
      }
      // Video without poster
      return { url: null, isVideoWithoutPoster: true };
    }

    // Regular image
    return { 
      url: mediaItem.variants?.thumb?.url || mediaItem.url, 
      isVideoWithoutPoster: false 
    };
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Page navigation
  const goToPage = (page: number) => {
    setCurrentPage(page);
    updateURL({ page: page.toString() });
    clearSelection();
  };

  // Handle entry click - open in sheet on desktop, navigate on mobile
  const handleEntryClick = (entry: Entry, e: React.MouseEvent) => {
    if (isDesktop) {
      e.preventDefault();
      setEditingEntry(entry);
      setIsCreatingNew(null);
      setSheetOpen(true);
      // Update URL to reflect the editing entry
      const params = new URLSearchParams(searchParams.toString());
      params.set("edit", `${entry.collection}/${entry.slug}`);
      router.push(`/admin/content?${params.toString()}`, { scroll: false });
    }
    // On mobile, let the Link handle navigation
  };

  // Handle create new - open in sheet on desktop, navigate on mobile
  const handleCreateNew = (type: "post" | "article") => {
    if (isDesktop) {
      setEditingEntry(null);
      setIsCreatingNew(type);
      setSheetOpen(true);
      // Update URL to reflect creating new
      const params = new URLSearchParams(searchParams.toString());
      params.set("edit", `${type}s/new`);
      router.push(`/admin/content?${params.toString()}`, { scroll: false });
    } else {
      if (type === "post") {
        router.push("/admin/content/posts/new");
      } else {
        router.push("/admin/content/articles/new");
      }
    }
  };

  // Handle sheet close
  const handleSheetClose = () => {
    setSheetOpen(false);
    setEditingEntry(null);
    setIsCreatingNew(null);
    // Remove edit param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const newUrl = params.toString() ? `/admin/content?${params.toString()}` : "/admin/content";
    router.push(newUrl, { scroll: false });
  };

  // Handle after save in sheet - just refresh data, don't close
  const handleSheetSaved = () => {
    fetchData();
  };

  // Action handlers
  const handleToggleStatus = async (entry: Entry) => {
    const newStatus = entry.status === "published" ? "draft" : "published";
    const action = entry.status === "published" ? "unpublish" : "publish";

    if (
      !confirm(
        `Are you sure you want to ${action} "${(entry.data.title as string) || entry.slug}"?`
      )
    ) {
      return;
    }

    setActionLoading(entry.id);
    try {
      const res = await fetch(
        `/api/admin/collections/${entry.collection}/entries/${entry.slug}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) throw new Error("Failed to update status");

      setEntries(
        entries.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                status: newStatus,
                publishedAt:
                  newStatus === "published"
                    ? new Date().toISOString()
                    : e.publishedAt,
              }
            : e
        )
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (entry: Entry) => {
    if (
      !confirm(
        `Are you sure you want to delete "${(entry.data.title as string) || entry.slug}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setActionLoading(entry.id);
    try {
      const res = await fetch(
        `/api/admin/collections/${entry.collection}/entries/${entry.slug}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete");

      setEntries(entries.filter((e) => e.id !== entry.id));
      selectedIds.delete(entry.id);
      setSelectedIds(new Set(selectedIds));
      toast.success("Entry deleted successfully");
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete entry");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (entry: Entry) => {
    setActionLoading(entry.id);
    try {
      const res = await fetch(
        `/api/admin/collections/${entry.collection}/entries/${entry.slug}/duplicate`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("Failed to duplicate");

      await fetchData();
      toast.success("Entry duplicated successfully");
    } catch (error) {
      console.error("Failed to duplicate:", error);
      toast.error("Failed to duplicate entry");
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk action handlers
  const handleBulkAction = async (
    action: "publish" | "unpublish" | "delete" | "duplicate"
  ) => {
    if (selectedIds.size === 0) return;

    const actionLabels = {
      publish: "publish",
      unpublish: "unpublish",
      delete: "delete",
      duplicate: "duplicate",
    };

    if (
      !confirm(
        `Are you sure you want to ${actionLabels[action]} ${selectedIds.size} entries?${action === "delete" ? " This cannot be undone." : ""}`
      )
    ) {
      return;
    }

    setActionLoading("bulk");
    try {
      if (action === "publish" || action === "unpublish") {
        const newStatus = action === "publish" ? "published" : "draft";
        await Promise.all(
          Array.from(selectedIds).map(async (id) => {
            const entry = entries.find((e) => e.id === id);
            if (entry) {
              await fetch(
                `/api/admin/collections/${entry.collection}/entries/${entry.slug}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: newStatus }),
                }
              );
            }
          })
        );
        setEntries(
          entries.map((e) =>
            selectedIds.has(e.id) ? { ...e, status: newStatus as "published" | "draft" } : e
          )
        );
      } else if (action === "delete") {
        await Promise.all(
          Array.from(selectedIds).map(async (id) => {
            const entry = entries.find((e) => e.id === id);
            if (entry) {
              await fetch(
                `/api/admin/collections/${entry.collection}/entries/${entry.slug}`,
                { method: "DELETE" }
              );
            }
          })
        );
        setEntries(entries.filter((e) => !selectedIds.has(e.id)));
      } else if (action === "duplicate") {
        for (const id of Array.from(selectedIds)) {
          const entry = entries.find((e) => e.id === id);
          if (entry) {
            await fetch(
              `/api/admin/collections/${entry.collection}/entries/${entry.slug}/duplicate`,
              { method: "POST" }
            );
          }
        }
        await fetchData();
      }

      clearSelection();
      toast.success(`Successfully ${action === "publish" ? "published" : action === "unpublish" ? "unpublished" : action === "delete" ? "deleted" : "duplicated"} ${selectedIds.size} entries`);
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast.error(`Failed to ${action} some entries`);
    } finally {
      setActionLoading(null);
    }
  };

  // Determine checkbox state
  const allOnPageIds = paginatedEntries.map((e) => e.id);
  const selectedOnPage = allOnPageIds.filter((id) => selectedIds.has(id));
  const isAllOnPageSelected = paginatedEntries.length > 0 && selectedOnPage.length === paginatedEntries.length;
  const isSomeOnPageSelected = selectedOnPage.length > 0 && selectedOnPage.length < paginatedEntries.length;
  const isSomeSelected = selectedIds.size > 0;

  // Sort labels
  const sortLabels: Record<SortOption, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    "name-asc": "Name (A-Z)",
    "name-desc": "Name (Z-A)",
  };

  // Check if filters are non-default
  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || sortBy !== "newest" || searchQuery.trim() !== "";

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setSortBy("newest");
    setTypeFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
    updateURL({ tab: null, page: null });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - 56px tall */}
      <div className="border-b px-4 h-14 flex items-center">
        <PageHeader title="Posts" count={filteredEntries.length}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreateNew("post")}>
                <Image className="w-4 h-4 mr-2" />
                New Post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateNew("article")}>
                <FileText className="w-4 h-4 mr-2" />
                New Article
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PageHeader>
      </div>

      {/* Filters Row - 56px tall */}
      <div className="border-b px-4 h-14 flex items-center gap-3">
        {/* Checkbox for select all */}
        <div 
          className="flex items-center justify-center w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            // Toggle select all manually
            if (isAllOnPageSelected) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(paginatedEntries.map((e) => e.id)));
            }
          }}
        >
          <Checkbox
            checked={isAllOnPageSelected ? true : isSomeOnPageSelected ? "indeterminate" : false}
            aria-label="Select all on page"
          />
        </div>

        {/* Search - fills available space on desktop */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>

        {/* Mobile/Tablet Filter Button - visible below xl (1280px) */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilterModal(true)}
          className="xl:hidden shrink-0 relative"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {hasActiveFilters && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>

        {/* Type Filter - Desktop (xl+) */}
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value as ContentFilter);
            setCurrentPage(1);
            updateURL({ tab: value, page: null });
          }}
        >
          <SelectTrigger className="w-[140px] hidden xl:flex">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="posts">Posts</SelectItem>
            <SelectItem value="articles">Articles</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter - Desktop (xl+) */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] hidden xl:flex">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
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

        {/* Reset Filters Button - Desktop (xl+) */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={resetFilters}
            className="shrink-0 hidden xl:flex"
            aria-label="Reset filters"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        {/* Bulk Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!isSomeSelected || actionLoading === "bulk"}
              className="shrink-0"
            >
              {actionLoading === "bulk" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleBulkAction("publish")}>
              <Eye className="w-4 h-4 mr-2" />
              Publish ({selectedIds.size})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkAction("unpublish")}>
              <EyeOff className="w-4 h-4 mr-2" />
              Unpublish ({selectedIds.size})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkAction("duplicate")}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate ({selectedIds.size})
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleBulkAction("delete")}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.size})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : paginatedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 lg:py-20 text-center px-4">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 lg:w-8 lg:h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No content yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {searchQuery
                ? "No posts match your search"
                : `Get started by creating your first ${typeFilter === "posts" ? "post" : typeFilter === "articles" ? "article" : "content"}`}
            </p>
            {!searchQuery && (
              <Button onClick={() => handleCreateNew("post")}>
                <Plus className="mr-2 h-4 w-4" />
                Create New
              </Button>
            )}
          </div>
        ) : (
          <div>
            {paginatedEntries.map((entry, index) => {
              const { url: thumbnail, isVideoWithoutPoster } = getThumbnailData(entry);
              const isPost = entry.collection === "posts";
              const isSelected = selectedIds.has(entry.id);
              const isLast = index === paginatedEntries.length - 1;

              return (
                <ListRow
                  key={entry.id}
                  href={isDesktop ? undefined : `/admin/content/${entry.collection}/${entry.slug}`}
                  onClick={(e) => handleEntryClick(entry, e)}
                  selected={isSelected}
                  noBorder={isLast}
                  className="px-4"
                >
                  {/* Checkbox */}
                  <ListRowCheckbox>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(entry.id)}
                      aria-label={`Select ${entry.data.title || entry.slug}`}
                    />
                  </ListRowCheckbox>

                  {/* Thumbnail */}
                  <div className="shrink-0">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : isVideoWithoutPoster ? (
                      <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Film className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        {isPost ? (
                          <Image className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <ListRowContent>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm lg:text-base truncate">
                        {(entry.data.title as string) || entry.slug}
                      </span>
                      <TypePill type={isPost ? "post" : "article"} />
                      <StatusPill status={entry.status} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {(entry.data.description as string) ||
                        (entry.data.excerpt as string) ||
                        "No description"}
                    </p>
                  </ListRowContent>

                  {/* Actions */}
                  <ListRowActions>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={actionLoading === entry.id}
                          onClick={(e) => e.preventDefault()}
                        >
                          {actionLoading === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            if (isDesktop) {
                              setEditingEntry(entry);
                              setIsCreatingNew(null);
                              setSheetOpen(true);
                              // Update URL to reflect the editing entry
                              const params = new URLSearchParams(searchParams.toString());
                              params.set("edit", `${entry.collection}/${entry.slug}`);
                              router.push(`/admin/content?${params.toString()}`, { scroll: false });
                            } else {
                              router.push(`/admin/content/${entry.collection}/${entry.slug}`);
                            }
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleDuplicate(entry);
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleStatus(entry);
                          }}
                        >
                          {entry.status === "published" ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Publish
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(entry);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ListRowActions>
                </ListRow>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="ghost"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

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
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as ContentFilter);
                  setCurrentPage(1);
                  updateURL({ tab: value, page: null });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="posts">Posts</SelectItem>
                  <SelectItem value="articles">Articles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    resetFilters();
                    setShowFilterModal(false);
                  }}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
              <Button
                onClick={() => setShowFilterModal(false)}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor Sheet (Desktop) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-[600px] p-0"
          hideCloseButton
          noOverlay
        >
          <SheetTitle className="sr-only">
            {editingEntry ? `Edit ${editingEntry.collection}` : `New ${isCreatingNew}`}
          </SheetTitle>
          {editingEntry?.collection === "posts" && (
            <PostEditorForm
              slug={editingEntry.slug}
              onClose={handleSheetClose}
              onSaved={handleSheetSaved}
              isSheet
            />
          )}
          {editingEntry?.collection === "articles" && (
            <ArticleEditorForm
              slug={editingEntry.slug}
              onClose={handleSheetClose}
              onSaved={handleSheetSaved}
              isSheet
            />
          )}
          {isCreatingNew === "post" && (
            <PostEditorForm
              onClose={handleSheetClose}
              onSaved={handleSheetSaved}
              isSheet
            />
          )}
          {isCreatingNew === "article" && (
            <ArticleEditorForm
              onClose={handleSheetClose}
              onSaved={handleSheetSaved}
              isSheet
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ContentListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ContentListPageContent />
    </Suspense>
  );
}
