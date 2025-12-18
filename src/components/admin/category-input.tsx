"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Loader2, Plus } from "lucide-react";

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
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{suggestedHint}</p>
      )}

      {/* Input container */}
      <div
        className={`min-h-[48px] px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg flex flex-wrap gap-2 items-center cursor-text transition-all ${
          isOpen
            ? "border-zinc-900 ring-2 ring-zinc-900 bg-white dark:border-zinc-100 dark:ring-zinc-100 dark:bg-zinc-900"
            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {/* Selected categories */}
        {value.map((catId) => {
          const category = categories.find((c) => c.id === catId);
          return (
            <span
              key={catId}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm"
              style={{
                backgroundColor: category?.color
                  ? `${category.color}20`
                  : "#e4e4e7",
                color: category?.color || "#52525b",
              }}
            >
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
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        />

        {loading || creating ? (
          <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
        ) : (
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !loading && (filteredCategories.length > 0 || showCustomOption) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 py-1 max-h-48 overflow-auto">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                addCategory(cat.id);
                inputRef.current?.focus();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-zinc-900 dark:text-zinc-100">{cat.label}</span>
              {cat.description && (
                <span className="text-zinc-400 text-xs ml-auto truncate max-w-[150px]">
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
              className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 disabled:opacity-50"
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
