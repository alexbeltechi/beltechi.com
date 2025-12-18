"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  label: string;
  color: string;
  description?: string;
}

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
  });
  const [saving, setSaving] = useState(false);

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
      setNewCategory({ label: "", color: "#64748B", description: "" });
      setShowAddForm(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add category");
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
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to update category"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      await fetchCategories();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete category"
      );
    }
  }

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

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">
            Categories
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage categories for posts and articles
          </p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Add Category Form */}
      {showAddForm && (
        <Card className="p-4 lg:p-6 !py-4 lg:!py-6 !gap-0">
          <h2 className="text-base font-semibold mb-4">
            New Category
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-label">Label</Label>
              <Input
                id="new-label"
                type="text"
                value={newCategory.label || ""}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, label: e.target.value })
                }
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
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="new-description"
                type="text"
                value={newCategory.description || ""}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    description: e.target.value,
                  })
                }
                placeholder="Brief description"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCategory({
                    label: "",
                    color: "#64748B",
                    description: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCategory}
                disabled={saving || !newCategory.label?.trim()}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Category
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Categories List */}
      <Card className="overflow-hidden !py-0 !gap-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              No categories yet. Add your first category above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
              >
                {editingId === category.id ? (
                  // Edit mode
                  <div className="flex-1 space-y-3">
                    <Input
                      type="text"
                      value={editForm.label ?? category.label}
                      onChange={(e) =>
                        setEditForm({ ...editForm, label: e.target.value })
                      }
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
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Description"
                    />
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
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-5 h-5 rounded-full shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <p className="font-medium text-sm">
                          {category.label}
                        </p>
                        {category.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditForm({});
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
