/**
 * MongoDB Storage Implementation
 * 
 * Replaces file-based storage with MongoDB for content entries
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import type { Entry, EntryStatus } from "@/lib/cms/types";
import { ObjectId } from "mongodb";
import { getCollection, validateEntryData } from "@/lib/cms/schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Slugify text for URLs
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

/**
 * List all entries in a collection
 */
export async function listEntries(
  collection: string,
  options: {
    status?: EntryStatus;
    limit?: number;
    offset?: number;
    sortField?: string;
    sortDirection?: "asc" | "desc";
  } = {}
): Promise<{ entries: Entry[]; total: number }> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  // Build filter
  const filter: Record<string, unknown> = { collection };
  if (options.status) {
    filter.status = options.status;
  }

  // Get total count
  const total = await entriesCollection.countDocuments(filter);

  // Build sort
  const sortField = options.sortField || "createdAt";
  const sortDir = options.sortDirection === "asc" ? 1 : -1;
  const sort: { [key: string]: 1 | -1 } = { [sortField]: sortDir as 1 | -1 };

  // Query with pagination
  const limit = options.limit || 1000;
  const offset = options.offset || 0;

  const cursor = entriesCollection
    .find(filter)
    .sort(sort)
    .skip(offset)
    .limit(limit);

  const rawEntries = await cursor.toArray();
  
  // Clean MongoDB documents for React serialization
  const entries = rawEntries.map((doc) => {
    const { _id, ...rest } = doc;
    return rest as Entry;
  });

  return { entries, total };
}

/**
 * Get a single entry by slug
 */
export async function getEntry(
  collection: string,
  slug: string
): Promise<Entry | null> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const doc = await entriesCollection.findOne({ collection, slug });
  if (!doc) return null;
  
  // Clean MongoDB document for React serialization
  const { _id, ...entry } = doc;
  return entry as Entry;
}

/**
 * Create a new entry
 */
export async function createEntry(
  collection: string,
  data: {
    title?: string;
    slug?: string;
    status?: EntryStatus;
    data: Record<string, unknown>;
  }
): Promise<{ entry?: Entry; error?: string }> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  // Validate collection exists
  const schema = await getCollection(collection);
  if (!schema) {
    return { error: `Collection "${collection}" not found` };
  }

  // Validate data against schema (required fields only enforced when publishing)
  const status = data.status || "draft";
  const validation = validateEntryData(schema, data.data, status);
  if (!validation.valid) {
    return { error: validation.errors.join(", ") };
  }

  // Generate slug from title or use provided
  const titleField = schema.admin.titleField;
  const title = (data.data[titleField] as string) || data.title || "untitled";
  let slug = data.slug || slugify(title);

  // Ensure slug is unique
  const existing = await getEntry(collection, slug);
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const now = new Date().toISOString();

  const entry: Entry = {
    id: uuidv4(),
    collection: collection as any,
    slug,
    status: data.status || "draft",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    publishedAt: data.status === "published" ? now : null,
    authorId: null,
    data: data.data as any,
  };

  await entriesCollection.insertOne(entry as unknown as Record<string, unknown>);

  return { entry };
}

/**
 * Update an existing entry
 */
export async function updateEntry(
  collection: string,
  slug: string,
  updates: {
    slug?: string;
    status?: EntryStatus;
    data?: Record<string, unknown>;
  }
): Promise<{ entry?: Entry; error?: string }> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  // Get existing entry
  const existing = await getEntry(collection, slug);
  if (!existing) {
    return { error: `Entry "${slug}" not found in "${collection}"` };
  }

  // Validate collection exists
  const schema = await getCollection(collection);
  if (!schema) {
    return { error: `Collection "${collection}" not found` };
  }

  // Merge data
  const mergedData = updates.data ? { ...existing.data, ...updates.data } : existing.data;

  // Validate data against schema
  const status = updates.status || existing.status;
  const validation = validateEntryData(schema, mergedData, status);
  if (!validation.valid) {
    return { error: validation.errors.join(", ") };
  }

  const now = new Date().toISOString();

  // Handle slug change
  let newSlug = slug;
  if (updates.slug && updates.slug !== slug) {
    // Check if new slug is unique
    const slugExists = await getEntry(collection, updates.slug);
    if (slugExists) {
      return { error: `Slug "${updates.slug}" is already in use` };
    }
    newSlug = updates.slug;
  }

  const updated = {
    ...existing,
    ...updates,
    slug: newSlug,
    data: mergedData as any,
    updatedAt: now,
    publishedAt:
      updates.status === "published" && !existing.publishedAt
        ? now
        : existing.publishedAt,
  } as Entry;

  await entriesCollection.updateOne(
    { collection, slug },
    { $set: updated }
  );

  return { entry: updated };
}

/**
 * Delete an entry
 */
export async function deleteEntry(
  collection: string,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const result = await entriesCollection.deleteOne({ collection, slug });
  
  if (result.deletedCount === 0) {
    return { success: false, error: `Entry "${slug}" not found` };
  }

  return { success: true };
}

/**
 * Get all published entries (for public site)
 */
export async function getPublishedEntries(
  collection?: string
): Promise<Entry[]> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const filter: Record<string, unknown> = { status: "published" };
  if (collection) {
    filter.collection = collection;
  }

  const rawEntries = await entriesCollection
    .find(filter)
    .sort({ publishedAt: -1, createdAt: -1 })
    .toArray();

  // Clean MongoDB documents for React serialization
  return rawEntries.map((doc) => {
    const { _id, ...rest } = doc;
    return rest as Entry;
  });
}

