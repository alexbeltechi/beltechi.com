"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Loader2, Plus, GripVertical } from "lucide-react";

interface Category {
  id: string;
  label: string;
  color: string;
  description?: string;
}

interface CategoryInputProps {
  value: string[];
  onChange: (categories: string[]) => void;
  placeholder?: string;
}

// Generate a random pleasing color for new categories
function generateRandomColor(): string {
  const colors = [
    "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
    "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
    "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
    "#EC4899", "#F43F5E", "#64748B",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function CategoryInput({
  value,
  onChange,
  placeholder = "Add categories...",
}: CategoryInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch categories from API
  useEffect(() => {
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
    fetchCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addCategory = (categoryId: string) => {
    if (!value.includes(categoryId)) {
      onChange([...value, categoryId]);
    }
    setInputValue("");
  };

  const removeCategory = (categoryId: string) => {
    onChange(value.filter((c) => c !== categoryId));
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newValue = [...value];
    const draggedItem = newValue[draggedIndex];
    newValue.splice(draggedIndex, 1);
    newValue.splice(index, 0, draggedItem);
    onChange(newValue);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Create a new category via API
  const createNewCategory = async (label: string) => {
    const customId = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if already exists
    if (categories.some((c) => c.id === customId)) {
      addCategory(customId);
      return;
    }

    setCreating(true);
    try {
      const color = generateRandomColor();
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customId,
          label: label.trim(),
          color,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create category");
      }

      const data = await res.json();
      const newCategory = data.data;

      // Add to local categories list
      setCategories((prev) => [...prev, newCategory]);
      
      // Select the new category
      addCategory(newCategory.id);
    } catch (error) {
      console.error("Failed to create category:", error);
      alert(error instanceof Error ? error.message : "Failed to create category");
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      // Try to match existing category or create new one
      const match = categories.find(
        (c) =>
          c.label.toLowerCase() === inputValue.toLowerCase() ||
          c.id === inputValue.toLowerCase()
      );
      if (match) {
        addCategory(match.id);
      } else {
        // Create new category via API
        createNewCategory(inputValue.trim());
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeCategory(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const filteredCategories = categories.filter(
    (cat) =>
      !value.includes(cat.id) &&
      (cat.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        cat.id.includes(inputValue.toLowerCase()))
  );

  const showCustomOption =
    inputValue.trim() &&
    !categories.some(
      (cat) =>
        cat.id === inputValue.toLowerCase().trim() ||
        cat.label.toLowerCase() === inputValue.toLowerCase().trim()
    ) &&
    !value.includes(
      inputValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );

  // Get suggested categories for hint
  const suggestedHint = categories
    .slice(0, 4)
    .map((c) => c.label)
    .join(" / ");

  return (
    <div ref={containerRef} className="relative">
      {/* Label hint */}
      {categories.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">{suggestedHint}</p>
      )}

      {/* Input container */}
      <div
        className={`min-h-9 px-3 py-2 bg-background border border-input rounded-md shadow-xs flex flex-wrap gap-2 items-center cursor-text transition-[color,box-shadow] ${
          isOpen
            ? "border-ring ring-ring/50 ring-[3px]"
            : ""
        }`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {/* Selected categories */}
        {value.map((catId, index) => {
          const category = categories.find((c) => c.id === catId);
          return (
            <span
              key={catId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`inline-flex items-center gap-1 pl-1 pr-2 py-1 rounded-md text-sm cursor-grab active:cursor-grabbing transition-all ${
                draggedIndex === index ? "opacity-50 scale-95" : ""
              }`}
              style={{
                backgroundColor: category?.color
                  ? `${category.color}20`
                  : "#e4e4e7",
                color: category?.color || "#52525b",
              }}
            >
              <GripVertical className="w-3 h-3 opacity-50" />
              {category?.label || catId}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCategory(catId);
                }}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />

        {loading || creating ? (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !loading && (filteredCategories.length > 0 || showCustomOption) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-10 py-1 max-h-48 overflow-auto">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                addCategory(cat.id);
                inputRef.current?.focus();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-foreground">{cat.label}</span>
              {cat.description && (
                <span className="text-muted-foreground text-xs ml-auto truncate max-w-[150px]">
                  {cat.description}
                </span>
              )}
            </button>
          ))}

          {showCustomOption && (
            <button
              type="button"
              disabled={creating}
              onClick={() => {
                createNewCategory(inputValue.trim());
                inputRef.current?.focus();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors text-muted-foreground border-t border-border flex items-center gap-2 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              Create &quot;{inputValue.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
