"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  Tag,
  GripVertical,
  Search,
  MoreVertical,
  Eye,
  EyeOff,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { PageHeader } from "@/components/lib";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Category {
  id: string;
  label: string;
  color: string;
  description?: string;
  order?: number;
  showOnHomepage?: boolean;
}

type VisibilityFilter = "all" | "visible" | "hidden";
type SortOption = "manual" | "a-z" | "z-a";

const COLOR_PRESETS = [
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#6366F1", // indigo
  "#14B8A6", // teal
  "#EF4444", // red
  "#64748B", // slate
  "#0EA5E9", // sky
  "#22C55E", // green
  "#A855F7", // violet
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    label: "",
    color: "#64748B",
    description: "",
    showOnHomepage: true,
  });
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("manual");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Mobile filter modal
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let result = [...categories];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (cat) =>
          cat.label.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query)
      );
    }

    // Visibility filter
    if (visibilityFilter === "visible") {
      result = result.filter((cat) => cat.showOnHomepage !== false);
    } else if (visibilityFilter === "hidden") {
      result = result.filter((cat) => cat.showOnHomepage === false);
    }

    // Sort
    if (sortOption === "a-z") {
      result.sort((a, b) => a.label.localeCompare(b.label));
    } else if (sortOption === "z-a") {
      result.sort((a, b) => b.label.localeCompare(a.label));
    }
    // "manual" keeps the original order

    return result;
  }, [categories, searchQuery, visibilityFilter, sortOption]);

  // Check if filters are active
  const hasActiveFilters = visibilityFilter !== "all" || searchQuery.trim() !== "";

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setVisibilityFilter("all");
    setSortOption("manual");
  };

  async function handleAddCategory() {
    if (!newCategory.label?.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      await fetchCategories();
      setNewCategory({ label: "", color: "#64748B", description: "", showOnHomepage: true });
      setShowAddForm(false);
      toast.success("Category created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add category");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCategory(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      await fetchCategories();
      setEditingId(null);
      setEditForm({});
      toast.success("Category updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      await fetchCategories();
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleVisibility(category: Category) {
    const newVisibility = !(category.showOnHomepage ?? true);
    setActionLoading(category.id);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnHomepage: newVisibility }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      await fetchCategories();
      toast.success(`Category ${newVisibility ? "shown on" : "hidden from"} homepage`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update visibility");
    } finally {
      setActionLoading(null);
    }
  }

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk actions
  async function handleBulkAction(action: "show" | "hide" | "delete") {
    if (selectedIds.size === 0) return;

    const actionLabels = {
      show: "show on homepage",
      hide: "hide from homepage",
      delete: "delete",
    };

    if (
      !confirm(
        `Are you sure you want to ${actionLabels[action]} ${selectedIds.size} categories?${action === "delete" ? " This cannot be undone." : ""}`
      )
    ) {
      return;
    }

    setActionLoading("bulk");
    try {
      if (action === "show" || action === "hide") {
        await Promise.all(
          Array.from(selectedIds).map((id) =>
            fetch(`/api/admin/categories/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ showOnHomepage: action === "show" }),
            })
          )
        );
      } else if (action === "delete") {
        await Promise.all(
          Array.from(selectedIds).map((id) =>
            fetch(`/api/admin/categories/${id}`, { method: "DELETE" })
          )
        );
      }

      await fetchCategories();
      clearSelection();
      toast.success(`Successfully ${actionLabels[action]} ${selectedIds.size} categories`);
    } catch (error) {
      toast.error(`Failed to ${actionLabels[action]} some categories`);
    } finally {
      setActionLoading(null);
    }
  }

  // Drag and drop handlers (only work in manual sort mode)
  function handleDragStart(index: number) {
    if (sortOption !== "manual") return;
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (sortOption !== "manual" || draggedIndex === null || draggedIndex === index) return;

    const newCategories = [...categories];
    const draggedItem = newCategories[draggedIndex];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(index, 0, draggedItem);
    setCategories(newCategories);
    setDraggedIndex(index);
  }

  async function handleDragEnd() {
    if (draggedIndex === null) return;
    setDraggedIndex(null);

    setReordering(true);
    try {
      const orderedIds = categories.map((c) => c.id);
      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderedIds }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error("Failed to save order:", error);
      await fetchCategories();
    } finally {
      setReordering(false);
    }
  }

  // Checkbox states
  const allOnPageIds = filteredCategories.map((c) => c.id);
  const selectedOnPage = allOnPageIds.filter((id) => selectedIds.has(id));
  const isAllSelected = filteredCategories.length > 0 && selectedOnPage.length === filteredCategories.length;
  const isSomeSelected = selectedOnPage.length > 0 && selectedOnPage.length < filteredCategories.length;
  const hasSelection = selectedIds.size > 0;

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditForm({
      label: category.label,
      color: category.color,
      description: category.description,
      showOnHomepage: category.showOnHomepage ?? true,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - 56px tall */}
      <div className="border-b px-4 h-14 flex items-center">
        <PageHeader title="Categories" count={filteredCategories.length}>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New category
          </Button>
        </PageHeader>
      </div>

      {/* Filters Row - 56px tall */}
      <div className="border-b px-4 h-14 flex items-center gap-3">
        {/* Checkbox for select all */}
        <div
          className="flex items-center justify-center w-8 shrink-0"
          onClick={() => {
            if (isAllSelected) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(filteredCategories.map((c) => c.id)));
            }
          }}
        >
          <Checkbox
            checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
            aria-label="Select all"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Mobile Filter Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowFilterModal(true)}
          className="sm:hidden shrink-0 relative"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {hasActiveFilters && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>

        {/* Visibility Filter - Desktop */}
        <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as VisibilityFilter)}>
          <SelectTrigger className="w-[130px] hidden sm:flex">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="visible">On homepage</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort - Desktop */}
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-[110px] hidden sm:flex">
            <SelectValue placeholder="Manual" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="a-z">A → Z</SelectItem>
            <SelectItem value="z-a">Z → A</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset Filters - Desktop */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={resetFilters}
            className="shrink-0 hidden sm:flex"
            aria-label="Reset filters"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1 hidden sm:block" />

        {/* Bulk Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!hasSelection || actionLoading === "bulk"}
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
            <DropdownMenuItem onClick={() => handleBulkAction("show")}>
              <Eye className="w-4 h-4 mr-2" />
              Show on homepage ({selectedIds.size})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkAction("hide")}>
              <EyeOff className="w-4 h-4 mr-2" />
              Hide from homepage ({selectedIds.size})
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Add Category Form */}
        {showAddForm && (
          <div className="px-4 py-4 border-b">
            <Card className="p-4 !gap-0">
              <h2 className="text-base font-semibold mb-4">New Category</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-label">Label</Label>
                  <Input
                    id="new-label"
                    type="text"
                    value={newCategory.label || ""}
                    onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
                    placeholder="Category name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCategory({ ...newCategory, color })}
                        className={cn(
                          "w-8 h-8 rounded-full transition-transform",
                          newCategory.color === color
                            ? "ring-2 ring-ring ring-offset-2 ring-offset-background scale-110"
                            : "hover:scale-110"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-description">
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="new-description"
                    type="text"
                    value={newCategory.description || ""}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="new-showOnHomepage" className="cursor-pointer">
                    Show on homepage
                  </Label>
                  <Switch
                    id="new-showOnHomepage"
                    checked={newCategory.showOnHomepage ?? true}
                    onCheckedChange={(checked) => setNewCategory({ ...newCategory, showOnHomepage: checked })}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCategory({ label: "", color: "#64748B", description: "", showOnHomepage: true });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddCategory} disabled={saving || !newCategory.label?.trim()}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add Category
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Categories List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCategories.length === 0 && categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Tag className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Get started by creating your first category</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-foreground font-medium mb-1">No results found</p>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className={cn("transition-opacity", reordering && "opacity-70")}>
            {filteredCategories.map((category, index) => {
              const isSelected = selectedIds.has(category.id);
              const isEditing = editingId === category.id;
              const isLast = index === filteredCategories.length - 1;
              const canDrag = sortOption === "manual" && !isEditing;

              return (
                <div
                  key={category.id}
                  draggable={canDrag}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-3 py-3 px-4 transition-colors",
                    !isLast && "border-b",
                    isSelected && "bg-accent/50",
                    !isEditing && "hover:bg-accent/30",
                    canDrag && "cursor-grab active:cursor-grabbing",
                    draggedIndex === index && "opacity-50 bg-accent"
                  )}
                >
                  {isEditing ? (
                    // Edit mode - full width form
                    <div className="flex-1 space-y-3">
                      <Input
                        type="text"
                        value={editForm.label ?? category.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        placeholder="Category name"
                      />
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, color })}
                            className={cn(
                              "w-6 h-6 rounded-full transition-transform",
                              (editForm.color ?? category.color) === color
                                ? "ring-2 ring-ring ring-offset-1 ring-offset-background scale-110"
                                : "hover:scale-110"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <Input
                        type="text"
                        value={editForm.description ?? category.description ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Description"
                      />
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`edit-homepage-${category.id}`} className="text-sm cursor-pointer">
                          Show on homepage
                        </Label>
                        <Switch
                          id={`edit-homepage-${category.id}`}
                          checked={editForm.showOnHomepage ?? category.showOnHomepage ?? true}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, showOnHomepage: checked })}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(null);
                            setEditForm({});
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateCategory(category.id)}
                          disabled={saving}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      {/* Checkbox */}
                      <div
                        className="flex items-center justify-center w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(category.id);
                        }}
                      >
                        <Checkbox checked={isSelected} aria-label={`Select ${category.label}`} />
                      </div>

                      {/* Drag Handle (only in manual sort) */}
                      {sortOption === "manual" && (
                        <div className="shrink-0 text-muted-foreground">
                          <GripVertical className="w-5 h-5" />
                        </div>
                      )}

                      {/* Color dot */}
                      <div
                        className="w-5 h-5 rounded-full shrink-0"
                        style={{ backgroundColor: category.color }}
                      />

                      {/* Category Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{category.label}</span>
                          {/* Visibility pill */}
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              category.showOnHomepage !== false
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            )}
                          >
                            {category.showOnHomepage !== false ? "Visible" : "Hidden"}
                          </span>
                        </div>
                        {category.description && (
                          <p className="text-sm text-muted-foreground truncate">{category.description}</p>
                        )}
                      </div>

                      {/* Actions Menu */}
                      <div className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actionLoading === category.id}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {actionLoading === category.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEdit(category)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleVisibility(category)}>
                              {category.showOnHomepage !== false ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Hide from homepage
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Show on homepage
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="sm:max-w-[320px] max-w-[calc(100%-32px)]">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Visibility Filter */}
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibilityFilter}
                onValueChange={(v) => setVisibilityFilter(v as VisibilityFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="visible">On homepage</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <Label>Sort by</Label>
              <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Manual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual order</SelectItem>
                  <SelectItem value="a-z">A → Z</SelectItem>
                  <SelectItem value="z-a">Z → A</SelectItem>
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
              <Button onClick={() => setShowFilterModal(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
