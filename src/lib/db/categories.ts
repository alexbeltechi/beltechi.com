/**
 * MongoDB Categories Storage
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

export interface Category {
  id: string;
  label: string;
  slug: string;
  order: number;
  showOnHomepage?: boolean;
}

/**
 * List all categories
 */
export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const categoriesCollection = db.collection(Collections.CATEGORIES);

  const rawCategories = await categoriesCollection
    .find({})
    .sort({ order: 1 })
    .toArray();

  // Clean MongoDB documents for React serialization
  return rawCategories.map((doc) => {
    const { _id, ...rest } = doc;
    return rest as Category;
  });
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDb();
  const categoriesCollection = db.collection(Collections.CATEGORIES);

  const doc = await categoriesCollection.findOne({ id });
  if (!doc) return null;
  
  const { _id, ...category } = doc;
  return category as Category;
}

/**
 * Create category
 */
export async function createCategory(
  data: Omit<Category, "id">
): Promise<Category> {
  const db = await getDb();
  const categoriesCollection = db.collection(Collections.CATEGORIES);

  const category = {
    ...data,
    id: new ObjectId().toString(),
  };

  await categoriesCollection.insertOne(category as unknown as Record<string, unknown>);

  return category as Category;
}

/**
 * Update category
 */
export async function updateCategory(
  id: string,
  updates: Partial<Category>
): Promise<Category> {
  const db = await getDb();
  const categoriesCollection = db.collection(Collections.CATEGORIES);

  await categoriesCollection.updateOne(
    { id },
    { $set: updates }
  );

  const doc = await categoriesCollection.findOne({ id });
  if (!doc) {
    throw new Error(`Category not found: ${id}`);
  }

  const { _id, ...category } = doc;
  return category as Category;
}

/**
 * Delete category
 */
export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  const categoriesCollection = db.collection(Collections.CATEGORIES);

  await categoriesCollection.deleteOne({ id });
}

/**
 * Reorder categories
 */
export async function reorderCategories(
  categoryIds: string[]
): Promise<void> {
  const db = await getDb();
  const categoriesCollection = db.collection(Collections.CATEGORIES);

  // Update order for each category
  const updates = categoryIds.map((id, index) => ({
    updateOne: {
      filter: { id },
      update: { $set: { order: index } },
    },
  }));

  if (updates.length > 0) {
    await categoriesCollection.bulkWrite(updates);
  }
}

