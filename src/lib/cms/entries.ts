/**
 * Entry Management
 * 
 * Handles CRUD operations for content entries (posts, articles, etc.)
 * Uses the storage abstraction layer for filesystem/GitHub compatibility.
 */

import { v4 as uuidv4 } from "uuid";
import type { Entry, EntryBase, EntryStatus } from "./types";
import { getCollection, validateEntryData } from "./schema";
import { slugify } from "../utils";
import { getStorage } from "./storage";

// Content directory paths (relative to project root)
const ENTRIES_BASE = "content/entries";

/**
 * Get the storage-relative path for an entry
 */
function getEntryPath(collection: string, slug: string): string {
  return `${ENTRIES_BASE}/${collection}/${slug}.json`;
}

/**
 * Get the storage-relative directory for a collection
 */
function getCollectionDir(collection: string): string {
  return `${ENTRIES_BASE}/${collection}`;
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
  const storage = getStorage();
  const dirPath = getCollectionDir(collection);

  try {
    const files = await storage.list(dirPath);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    let entries: Entry[] = [];

    for (const file of jsonFiles) {
      try {
        const content = await storage.read(`${dirPath}/${file}`);
        const entry = JSON.parse(content) as Entry;
        entries.push(entry);
      } catch (e) {
        console.warn(`Failed to read entry ${file}:`, e);
      }
    }

    // Filter by status
    if (options.status) {
      entries = entries.filter((e) => e.status === options.status);
    }

    // Sort
    const sortField = options.sortField || "createdAt";
    const sortDir = options.sortDirection || "desc";
    entries.sort((a, b) => {
      // Get value from entry or nested data
      const aVal = (sortField in a 
        ? (a as unknown as Record<string, unknown>)[sortField] 
        : a.data[sortField]) as string | undefined;
      const bVal = (sortField in b 
        ? (b as unknown as Record<string, unknown>)[sortField] 
        : b.data[sortField]) as string | undefined;
      
      const aStr = aVal || "";
      const bStr = bVal || "";
      
      if (sortDir === "asc") {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      }
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    });

    const total = entries.length;

    // Pagination
    if (options.offset !== undefined || options.limit !== undefined) {
      const offset = options.offset || 0;
      const limit = options.limit || 20;
      entries = entries.slice(offset, offset + limit);
    }

    return { entries, total };
  } catch (error) {
    // Directory doesn't exist yet
    console.warn(`Collection directory not found: ${dirPath}`);
    return { entries: [], total: 0 };
  }
}

/**
 * Get a single entry by slug
 */
export async function getEntry(
  collection: string,
  slug: string
): Promise<Entry | null> {
  const storage = getStorage();
  const filePath = getEntryPath(collection, slug);

  try {
    const content = await storage.read(filePath);
    return JSON.parse(content) as Entry;
  } catch {
    return null;
  }
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
  const storage = getStorage();

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

  const entry: EntryBase = {
    id: uuidv4(),
    collection,
    slug,
    status: data.status || "draft",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    publishedAt: data.status === "published" ? now : null,
    authorId: null,
    data: data.data,
  };

  // Ensure collection directory exists
  await storage.ensureDir(getCollectionDir(collection));

  // Write entry
  const filePath = getEntryPath(collection, slug);
  await storage.write(
    filePath,
    JSON.stringify(entry, null, 2),
    `Create ${collection}: ${title}`
  );

  return { entry: entry as Entry };
}

/**
 * Update an existing entry
 * @param publish - If true, changes go live. If false (and entry is published), changes are saved as pending.
 */
export async function updateEntry(
  collection: string,
  slug: string,
  updates: {
    slug?: string;
    status?: EntryStatus;
    data?: Record<string, unknown>;
  },
  publish: boolean = true
): Promise<{ entry?: Entry; error?: string }> {
  const storage = getStorage();
  const existing = await getEntry(collection, slug);
  
  if (!existing) {
    return { error: `Entry "${slug}" not found in "${collection}"` };
  }

  // If updating data, validate against schema (required fields only enforced when publishing)
  if (updates.data) {
    const schema = await getCollection(collection);
    if (schema) {
      const mergedData = { ...existing.data, ...updates.data };
      const targetStatus = updates.status || existing.status;
      const validation = validateEntryData(schema, mergedData, targetStatus);
      if (!validation.valid) {
        return { error: validation.errors.join(", ") };
      }
    }
  }

  const now = new Date().toISOString();

  // For published entries: save to pendingData unless explicitly publishing
  const isCurrentlyPublished = existing.status === "published";
  const isPublishing = publish || updates.status === "published" && existing.status !== "published";
  
  let updated: Entry;
  
  if (isCurrentlyPublished && !isPublishing && updates.data) {
    // Save changes to pendingData (working copy), keep data (live version) intact
    const pendingData = { ...existing.data, ...(existing.pendingData || {}), ...updates.data };
    updated = {
      ...existing,
      slug: updates.slug || existing.slug,
      status: existing.status, // Keep published
      updatedAt: now,
      data: existing.data, // Keep original live data
      pendingData, // Store pending changes
    } as Entry;
  } else if (isPublishing && updates.data) {
    // Publishing: apply pending changes + new changes to data, clear pendingData
    const mergedData = { ...existing.data, ...(existing.pendingData || {}), ...updates.data };
    updated = {
      ...existing,
      slug: updates.slug || existing.slug,
      status: updates.status || existing.status,
      updatedAt: now,
      publishedAt: now,
      data: mergedData,
      pendingData: undefined, // Clear pending changes
    } as Entry;
  } else {
    // Draft entries or no data changes: normal update
    const mergedData = updates.data 
      ? { ...existing.data, ...updates.data } 
      : existing.data;
    updated = {
      ...existing,
      slug: updates.slug || existing.slug,
      status: updates.status || existing.status,
      updatedAt: now,
      data: mergedData,
    } as Entry;
    
    // Handle publish status change for drafts
    if (updates.status === "published" && existing.status !== "published") {
      updated.publishedAt = now;
    }
  }

  // Get title for commit message
  const title = (updated.data.title as string) || slug;

  // If slug changed, delete old file and create new one
  if (updates.slug && updates.slug !== slug) {
    // Check new slug doesn't exist
    const existingNew = await getEntry(collection, updates.slug);
    if (existingNew) {
      return { error: `Slug "${updates.slug}" already exists` };
    }

    const oldPath = getEntryPath(collection, slug);
    const newPath = getEntryPath(collection, updates.slug);

    // Delete old file
    await storage.delete(oldPath, `Rename ${collection}: ${slug} → ${updates.slug}`);
    
    // Write new file
    await storage.write(
      newPath,
      JSON.stringify(updated, null, 2),
      `Rename ${collection}: ${slug} → ${updates.slug}`
    );
  } else {
    const filePath = getEntryPath(collection, slug);
    await storage.write(
      filePath,
      JSON.stringify(updated, null, 2),
      `Update ${collection}: ${title}`
    );
  }

  return { entry: updated };
}

/**
 * Delete an entry
 */
export async function deleteEntry(
  collection: string,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const storage = getStorage();
  const filePath = getEntryPath(collection, slug);

  try {
    // Get entry title for commit message
    const entry = await getEntry(collection, slug);
    const title = entry?.data.title as string || slug;

    await storage.delete(filePath, `Delete ${collection}: ${title}`);
    return { success: true };
  } catch {
    return { success: false, error: `Entry "${slug}" not found` };
  }
}

/**
 * Get all published entries across all collections (for public API)
 */
export async function getPublishedEntries(
  collection?: string
): Promise<Entry[]> {
  const collections = collection
    ? [collection]
    : ["posts", "articles"];

  const allEntries: Entry[] = [];

  for (const col of collections) {
    const { entries } = await listEntries(col, { status: "published" });
    allEntries.push(...entries);
  }

  // Sort by publishedAt descending
  allEntries.sort((a, b) => {
    const aDate = a.publishedAt || a.createdAt;
    const bDate = b.publishedAt || b.createdAt;
    return bDate.localeCompare(aDate);
  });

  return allEntries;
}
