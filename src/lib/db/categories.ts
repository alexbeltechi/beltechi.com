/**
 * MongoDB Categories Storage
 * 
 * Direct MongoDB operations for categories.
 * Each category is stored as an individual document (WordPress-style).
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import { v4 as uuidv4 } from "uuid";

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
  showOnHomepage?: boolean; // Whether to show in homepage category tabs
  seo?: {
    title?: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * List all categories
 */
export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  // Exclude old storage adapter documents
  const docs = await collection
    .find({ id: { $exists: true } })
    .sort({ order: 1, name: 1 })
    .toArray();

  // Clean MongoDB _id from results
  return docs.map((doc) => {
    const { _id, ...rest } = doc;
    return rest as Category;
  });
}

/**
 * Get category by ID
 */
export async function getCategory(id: string): Promise<Category | null> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const doc = await collection.findOne({ id });
  if (!doc) return null;

  const { _id, ...category } = doc;
  return category as Category;
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const doc = await collection.findOne({ 
    $or: [{ slug }, { id: slug }] // Fall back to id for backward compatibility
  });
  if (!doc) return null;

  const { _id, ...category } = doc;
  return category as Category;
}

/**
 * Create a new category
 */
export async function createCategory(
  data: Omit<Category, "id" | "slug" | "createdAt" | "updatedAt"> & {
    id?: string;
    slug?: string;
  }
): Promise<Category> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const now = new Date().toISOString();

  // Generate ID/slug from label/name if not provided
  const baseName = data.name || data.label;
  const id = data.id || uuidv4();
  const slug = data.slug || baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Check for duplicate
  const existing = await collection.findOne({ 
    $or: [{ id }, { slug }] 
  });
  if (existing) {
    throw new Error(`Category with id "${id}" or slug "${slug}" already exists`);
  }

  // Get max order for new category
  const maxOrder = await collection
    .find({})
    .sort({ order: -1 })
    .limit(1)
    .toArray();
  const nextOrder = maxOrder.length > 0 ? (maxOrder[0].order || 0) + 1 : 0;

  const category: Category = {
    id,
    slug,
    name: data.name || data.label,
    label: data.label || data.name || baseName,
    color: data.color,
    description: data.description,
    parentId: data.parentId,
    image: data.image,
    order: data.order ?? nextOrder,
    showOnHomepage: data.showOnHomepage ?? true,
    seo: data.seo,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(category as unknown as Record<string, unknown>);

  return category;
}

/**
 * Update an existing category
 */
export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, "id" | "createdAt">>
): Promise<Category> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const existing = await collection.findOne({ id });
  if (!existing) {
    throw new Error(`Category "${id}" not found`);
  }

  const updatedData = {
    ...updates,
    // Keep name and label in sync
    name: updates.name || updates.label || existing.name,
    label: updates.label || updates.name || existing.label,
    updatedAt: new Date().toISOString(),
  };

  await collection.updateOne({ id }, { $set: updatedData });

  const doc = await collection.findOne({ id });
  if (!doc) {
    throw new Error(`Category "${id}" not found after update`);
  }

  const { _id, ...category } = doc;
  return category as Category;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const result = await collection.deleteOne({ id });
  if (result.deletedCount === 0) {
    throw new Error(`Category "${id}" not found`);
  }
}

/**
 * Reorder categories
 */
export async function reorderCategories(ids: string[]): Promise<Category[]> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  const now = new Date().toISOString();

  // Update order for each category
  const updates = ids.map((id, index) => ({
    updateOne: {
      filter: { id },
      update: { $set: { order: index, updatedAt: now } },
    },
  }));

  if (updates.length > 0) {
    await collection.bulkWrite(updates);
  }

  // Return updated categories
  return listCategories();
}

/**
 * Get categories by parent (for hierarchical support)
 */
export async function getCategoriesByParent(parentId?: string): Promise<Category[]> {
  const categories = await listCategories();
  return categories.filter((c) => c.parentId === parentId);
}

/**
 * Count total categories
 */
export async function countCategories(): Promise<number> {
  const db = await getDb();
  const collection = db.collection(Collections.CATEGORIES);

  return collection.countDocuments({ id: { $exists: true } });
}
