/**
 * Category Management
 * 
 * Handles CRUD operations for content categories.
 * Uses the storage abstraction layer for filesystem/GitHub compatibility.
 */

import { getStorage } from "./storage";

export interface Category {
  id: string;
  slug: string;
  name: string;
  label: string; // For backward compatibility
  color: string;
  description?: string;
  parentId?: string; // For hierarchical categories (future)
  image?: string;
  order?: number;
  seo?: {
    title?: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CategoriesData {
  categories: Category[];
}

const CATEGORIES_PATH = "content/categories.json";

/**
 * Read categories from storage
 */
async function readCategoriesFile(): Promise<CategoriesData> {
  const storage = getStorage();
  
  try {
    const content = await storage.read(CATEGORIES_PATH);
    const data = JSON.parse(content) as CategoriesData;
    
    // Ensure all categories have required fields (migration support)
    data.categories = data.categories.map((cat) => ({
      ...cat,
      slug: cat.slug || cat.id,
      name: cat.name || cat.label,
      createdAt: cat.createdAt || new Date().toISOString(),
      updatedAt: cat.updatedAt || new Date().toISOString(),
    }));
    
    return data;
  } catch {
    return { categories: [] };
  }
}

/**
 * Write categories to storage
 */
async function writeCategoriesFile(
  data: CategoriesData,
  message?: string
): Promise<void> {
  const storage = getStorage();
  await storage.write(
    CATEGORIES_PATH,
    JSON.stringify(data, null, 2),
    message || "Update categories"
  );
}

/**
 * List all categories
 */
export async function listCategories(): Promise<Category[]> {
  const data = await readCategoriesFile();
  
  // Sort by order if available, then by name
  return data.categories.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return (a.name || a.label).localeCompare(b.name || b.label);
  });
}

/**
 * Get a single category by ID
 */
export async function getCategory(id: string): Promise<Category | null> {
  const categories = await listCategories();
  return categories.find((c) => c.id === id) || null;
}

/**
 * Get a category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await listCategories();
  return categories.find((c) => c.slug === slug || c.id === slug) || null;
}

/**
 * Create a new category
 */
export async function createCategory(
  category: Omit<Category, "id" | "slug" | "createdAt" | "updatedAt"> & { 
    id?: string;
    slug?: string;
  }
): Promise<Category> {
  const data = await readCategoriesFile();
  const now = new Date().toISOString();

  // Generate ID/slug from label/name if not provided
  const baseName = category.name || category.label;
  const id = category.id || baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const slug = category.slug || id;

  // Check for duplicate
  if (data.categories.some((c) => c.id === id)) {
    throw new Error(`Category with id "${id}" already exists`);
  }

  const newCategory: Category = {
    id,
    slug,
    name: category.name || category.label,
    label: category.label || category.name || baseName,
    color: category.color,
    description: category.description,
    parentId: category.parentId,
    image: category.image,
    order: category.order ?? data.categories.length,
    seo: category.seo,
    createdAt: now,
    updatedAt: now,
  };

  data.categories.push(newCategory);
  await writeCategoriesFile(data, `Create category: ${newCategory.name}`);

  return newCategory;
}

/**
 * Update an existing category
 */
export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, "id" | "createdAt">>
): Promise<Category> {
  const data = await readCategoriesFile();
  const index = data.categories.findIndex((c) => c.id === id);

  if (index === -1) {
    throw new Error(`Category "${id}" not found`);
  }

  const existing = data.categories[index];
  const updated: Category = {
    ...existing,
    ...updates,
    // Keep name and label in sync
    name: updates.name || updates.label || existing.name,
    label: updates.label || updates.name || existing.label,
    updatedAt: new Date().toISOString(),
  };

  data.categories[index] = updated;
  await writeCategoriesFile(data, `Update category: ${updated.name}`);

  return updated;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  const data = await readCategoriesFile();
  const category = data.categories.find((c) => c.id === id);

  if (!category) {
    throw new Error(`Category "${id}" not found`);
  }

  data.categories = data.categories.filter((c) => c.id !== id);
  await writeCategoriesFile(data, `Delete category: ${category.name}`);
}

/**
 * Reorder categories
 */
export async function reorderCategories(ids: string[]): Promise<Category[]> {
  const data = await readCategoriesFile();
  const categoryMap = new Map(data.categories.map((c) => [c.id, c]));

  // Reorder based on provided ids and update order field
  const reordered: Category[] = [];
  ids.forEach((id, index) => {
    const cat = categoryMap.get(id);
    if (cat) {
      cat.order = index;
      cat.updatedAt = new Date().toISOString();
      reordered.push(cat);
      categoryMap.delete(id);
    }
  });

  // Add any remaining categories not in the order list
  for (const cat of categoryMap.values()) {
    cat.order = reordered.length;
    reordered.push(cat);
  }

  data.categories = reordered;
  await writeCategoriesFile(data, "Reorder categories");

  return reordered;
}

/**
 * Get categories by parent (for hierarchical support)
 */
export async function getCategoriesByParent(parentId?: string): Promise<Category[]> {
  const categories = await listCategories();
  return categories.filter((c) => c.parentId === parentId);
}

/**
 * Get category tree (hierarchical structure)
 */
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const categories = await listCategories();
  const categoryMap = new Map<string, CategoryTreeNode>();
  
  // Create tree nodes
  for (const cat of categories) {
    categoryMap.set(cat.id, { ...cat, children: [] });
  }
  
  // Build tree
  const rootNodes: CategoryTreeNode[] = [];
  
  for (const node of categoryMap.values()) {
    if (node.parentId && categoryMap.has(node.parentId)) {
      categoryMap.get(node.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }
  
  return rootNodes;
}
