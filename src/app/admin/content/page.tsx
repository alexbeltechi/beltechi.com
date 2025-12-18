"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  FileText,
  Image,
  MoreHorizontal,
  Pencil,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type { Entry, MediaItem } from "@/lib/cms/types";

type ContentFilter = "all" | "posts" | "articles";

function ContentListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Read initial tab from URL
  const urlTab = searchParams.get("tab") as ContentFilter | null;
  const [filter, setFilter] = useState<ContentFilter>(urlTab || "all");
  
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, MediaItem>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Update URL when tab changes
  const handleFilterChange = (newFilter: string) => {
    const tab = newFilter as ContentFilter;
    setFilter(tab);
    
    // Update URL without full page reload
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "/admin/content";
    router.push(newUrl, { scroll: false });
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch both posts and articles
        const [postsRes, articlesRes, mediaRes] = await Promise.all([
          fetch("/api/admin/collections/posts/entries"),
          fetch("/api/admin/collections/articles/entries"),
          fetch("/api/admin/media"),
        ]);

        const postsData = await postsRes.json();
        const articlesData = await articlesRes.json();
        const mediaData = await mediaRes.json();

        // Combine and sort by updatedAt
        const allEntries = [
          ...(postsData.data || []),
          ...(articlesData.data || []),
        ].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        setEntries(allEntries);

        // Create media lookup map
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
    }

    fetchData();
  }, []);

  // Sync filter state with URL changes
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ContentFilter | null;
    if (tabParam && tabParam !== filter) {
      setFilter(tabParam);
    } else if (!tabParam && filter !== "all") {
      setFilter("all");
    }
  }, [searchParams, filter]);

  // Filter entries based on type and status
  const filteredEntries = entries.filter((entry) => {
    // Type filter
    if (filter === "posts" && entry.collection !== "posts") return false;
    if (filter === "articles" && entry.collection !== "articles") return false;

    // Status filter
    if (statusFilter !== "all" && entry.status !== statusFilter) return false;

    return true;
  });

  // Get thumbnail URL for an entry
  const getThumbnail = (entry: Entry): string | null => {
    if (entry.collection === "posts") {
      const media = entry.data.media as string[];
      if (media && media.length > 0) {
        const firstMedia = mediaMap[media[0]];
        if (firstMedia) {
          return firstMedia.variants?.thumb?.url || firstMedia.url;
        }
      }
    } else if (entry.collection === "articles") {
      const featuredImage = entry.data.featuredImage as string | undefined;
      if (featuredImage) {
        const mediaItem = mediaMap[featuredImage];
        if (mediaItem) {
          return mediaItem.variants?.thumb?.url || mediaItem.url;
        }
      }
    }
    return null;
  };

  // Handle status toggle
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

      // Update local state
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
      alert("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete
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
        {
          method: "DELETE",
        }
      );

      if (!res.ok) throw new Error("Failed to delete");

      // Remove from local state
      setEntries(entries.filter((e) => e.id !== entry.id));
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete entry");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (entry: Entry) => {
    setActionLoading(entry.id);
    try {
      const res = await fetch(
        `/api/admin/collections/${entry.collection}/entries/${entry.slug}/duplicate`,
        {
          method: "POST",
        }
      );

      if (!res.ok) throw new Error("Failed to duplicate");

      // Refresh the entries list
      const [postsRes, articlesRes] = await Promise.all([
        fetch("/api/admin/collections/posts/entries"),
        fetch("/api/admin/collections/articles/entries"),
      ]);

      const postsData = await postsRes.json();
      const articlesData = await articlesRes.json();

      const allEntries = [
        ...(postsData.data || []),
        ...(articlesData.data || []),
      ].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setEntries(allEntries);
    } catch (error) {
      console.error("Failed to duplicate:", error);
      alert("Failed to duplicate entry");
    } finally {
      setActionLoading(null);
    }
  };

  // Select mode handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
    }
  };

  const selectAllUnpublished = () => {
    const unpublishedIds = filteredEntries
      .filter((e) => e.status !== "published")
      .map((e) => e.id);
    setSelectedIds(new Set(unpublishedIds));
  };

  // Bulk actions
  const handleBulkPublish = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to publish ${selectedIds.size} entries?`)) {
      return;
    }
    
    setActionLoading("bulk");
    try {
      await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const entry = entries.find((e) => e.id === id);
          if (entry && entry.status !== "published") {
            await fetch(
              `/api/admin/collections/${entry.collection}/entries/${entry.slug}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "published" }),
              }
            );
          }
        })
      );
      
      // Refresh entries
      setEntries(
        entries.map((e) =>
          selectedIds.has(e.id) ? { ...e, status: "published" as const } : e
        )
      );
      cancelSelectMode();
    } catch (error) {
      console.error("Failed to publish:", error);
      alert("Failed to publish some entries");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkUnpublish = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to unpublish ${selectedIds.size} entries?`)) {
      return;
    }
    
    setActionLoading("bulk");
    try {
      await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const entry = entries.find((e) => e.id === id);
          if (entry && entry.status === "published") {
            await fetch(
              `/api/admin/collections/${entry.collection}/entries/${entry.slug}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "draft" }),
              }
            );
          }
        })
      );
      
      // Refresh entries
      setEntries(
        entries.map((e) =>
          selectedIds.has(e.id) ? { ...e, status: "draft" as const } : e
        )
      );
      cancelSelectMode();
    } catch (error) {
      console.error("Failed to unpublish:", error);
      alert("Failed to unpublish some entries");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} entries? This cannot be undone.`)) {
      return;
    }
    
    setActionLoading("bulk");
    try {
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
      
      // Remove deleted from state
      setEntries(entries.filter((e) => !selectedIds.has(e.id)));
      cancelSelectMode();
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete some entries");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to duplicate ${selectedIds.size} entries?`)) {
      return;
    }
    
    setActionLoading("bulk");
    try {
      const newEntries: Entry[] = [];
      
      for (const id of Array.from(selectedIds)) {
        const entry = entries.find((e) => e.id === id);
        if (entry) {
          const res = await fetch(
            `/api/admin/collections/${entry.collection}/entries/${entry.slug}/duplicate`,
            { method: "POST" }
          );
          
          if (res.ok) {
            const data = await res.json();
            // Fetch the new entry to add to state
            const newEntryRes = await fetch(
              `/api/admin/collections/${entry.collection}/entries/${data.slug}`
            );
            if (newEntryRes.ok) {
              const newEntryData = await newEntryRes.json();
              newEntries.push(newEntryData.data);
            }
          }
        }
      }
      
      // Add new entries to state and sort by date
      const updatedEntries = [...entries, ...newEntries].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setEntries(updatedEntries);
      
      // Select the newly duplicated entries instead of exiting select mode
      const newEntryIds = new Set(newEntries.map((e) => e.id));
      setSelectedIds(newEntryIds);
    } catch (error) {
      console.error("Failed to duplicate:", error);
      alert("Failed to duplicate some entries");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">
            Posts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your posts and articles
          </p>
        </div>
        <Button asChild className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
          <Link href="/admin/content/new">
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </Link>
        </Button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={handleFilterChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          {!selectMode && (
            <Button variant="outline" onClick={() => setSelectMode(true)}>
              Select
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Select Bar */}
      {selectMode && (
        <Card className="flex flex-col gap-3 p-3">
          {/* Mobile: stacked layout */}
          <div className="flex flex-col gap-2 sm:hidden">
            {/* Row 1: Publish + Unpublish */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleBulkPublish}
                disabled={selectedIds.size === 0 || actionLoading === "bulk"}
              >
                {actionLoading === "bulk" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Publish
              </Button>

              <Button
                className="flex-1"
                variant="outline"
                onClick={handleBulkUnpublish}
                disabled={selectedIds.size === 0 || actionLoading === "bulk"}
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Unpublish
              </Button>
            </div>

            {/* Row 2: Delete + Duplicate */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || actionLoading === "bulk"}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>

              <Button
                className="flex-1"
                variant="outline"
                onClick={handleBulkDuplicate}
                disabled={selectedIds.size === 0 || actionLoading === "bulk"}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
            </div>

            {/* Row 3: Unpublished + Select all */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={selectAllUnpublished}>
                Unpublished
              </Button>

              <Button variant="outline" className="flex-1" onClick={selectAll}>
                {selectedIds.size === filteredEntries.length ? "Deselect all" : "Select all"}
              </Button>
            </div>

            {/* Row 4: Cancel + count */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={cancelSelectMode}>
                Cancel
              </Button>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            </div>
          </div>

          {/* Desktop: horizontal layout */}
          <div className="hidden sm:flex sm:flex-row sm:items-center sm:gap-3">
            <Button
              onClick={handleBulkPublish}
              disabled={selectedIds.size === 0 || actionLoading === "bulk"}
            >
              {actionLoading === "bulk" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>

            <Button
              variant="outline"
              onClick={handleBulkUnpublish}
              disabled={selectedIds.size === 0 || actionLoading === "bulk"}
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Unpublish
            </Button>

            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0 || actionLoading === "bulk"}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>

            <Button
              variant="outline"
              onClick={handleBulkDuplicate}
              disabled={selectedIds.size === 0 || actionLoading === "bulk"}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>

            <Button variant="outline" onClick={cancelSelectMode}>
              Cancel
            </Button>

            <span className="ml-auto text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>

            <Button variant="outline" size="sm" onClick={selectAllUnpublished}>
              Unpublished
            </Button>

            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedIds.size === filteredEntries.length ? "Deselect all" : "Select all"}
            </Button>
          </div>
        </Card>
      )}

      {/* Content List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 lg:py-20 text-center !gap-0">
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 lg:w-8 lg:h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No content yet
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            Get started by creating your first{" "}
            {filter === "posts"
              ? "post"
              : filter === "articles"
                ? "article"
                : "content"}
          </p>
          <Button asChild className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            <Link href="/admin/content/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => {
            const thumbnail = getThumbnail(entry);
            const isPost = entry.collection === "posts";

            return (
              <Card
                key={entry.id}
                onClick={selectMode ? () => toggleSelect(entry.id) : undefined}
                className={`flex flex-row items-center !gap-3 lg:!gap-4 p-3 lg:p-4 !py-3 lg:!py-4 transition-all group ${
                  selectMode 
                    ? "cursor-pointer hover:bg-accent/50" 
                    : "hover:bg-accent/50"
                } ${selectMode && selectedIds.has(entry.id) ? "ring-2 ring-primary" : ""}`}
              >
                {/* Select Checkbox */}
                {selectMode && (
                  <Checkbox
                    checked={selectedIds.has(entry.id)}
                    onCheckedChange={() => toggleSelect(entry.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                )}

                {/* Thumbnail or Icon */}
                <Link
                  href={selectMode ? "#" : `/admin/content/${entry.collection}/${entry.slug}`}
                  onClick={selectMode ? (e) => e.preventDefault() : undefined}
                  className="shrink-0"
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg bg-muted flex items-center justify-center">
                      {isPost ? (
                        <Image className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
                      ) : (
                        <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </Link>

                {/* Content */}
                <Link
                  href={selectMode ? "#" : `/admin/content/${entry.collection}/${entry.slug}`}
                  onClick={selectMode ? (e) => e.preventDefault() : undefined}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold truncate text-sm lg:text-base">
                      {(entry.data.title as string) || entry.slug}
                    </h3>
                    {/* Type badge */}
                    <Badge variant="secondary" className="text-xs">
                      {isPost ? "Post" : "Article"}
                    </Badge>
                    {/* Status badge */}
                    <Badge
                      variant={
                        entry.status === "published"
                          ? "default"
                          : entry.status === "draft"
                            ? "outline"
                            : "secondary"
                      }
                      className={
                        entry.status === "published"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                          : entry.status === "draft"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                            : ""
                      }
                    >
                      {entry.status}
                    </Badge>
                  </div>
                  <p className="text-xs lg:text-sm text-muted-foreground truncate">
                    {(entry.data.description as string) ||
                      (entry.data.excerpt as string) ||
                      "No description"}
                  </p>
                </Link>

                {/* Meta - hidden on mobile */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(entry.updatedAt)}
                  </p>
                  {entry.publishedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Published {formatRelativeTime(entry.publishedAt)}
                    </p>
                  )}
                </div>

                {/* Actions Menu */}
                {!selectMode && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={actionLoading === entry.id}
                      >
                        {actionLoading === entry.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <MoreHorizontal className="w-5 h-5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/content/${entry.collection}/${entry.slug}`}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(entry)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(entry)}>
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
                        onClick={() => handleDelete(entry)}
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ContentListPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ContentListPageContent />
    </Suspense>
  );
}
