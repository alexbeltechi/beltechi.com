/**
 * MongoDB Storage Implementation
 * 
 * Replaces file-based storage with MongoDB for content entries
 */

import { getDb, Collections } from "@/lib/db/mongodb";
import type { Entry, EntryStatus } from "@/lib/cms/types";
import { ObjectId } from "mongodb";

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

  const entries = (await cursor.toArray()) as unknown as Entry[];

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

  const entry = await entriesCollection.findOne({ collection, slug });
  return entry as unknown as Entry | null;
}

/**
 * Create a new entry
 */
export async function createEntry(
  collection: string,
  data: Omit<Entry, "id" | "createdAt" | "updatedAt">
): Promise<Entry> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const now = new Date().toISOString();
  const entry = {
    ...data,
    id: new ObjectId().toString(),
    collection,
    createdAt: now,
    updatedAt: now,
  };

  await entriesCollection.insertOne(entry as unknown as Record<string, unknown>);

  return entry as Entry;
}

/**
 * Update an existing entry
 */
export async function updateEntry(
  collection: string,
  slug: string,
  updates: Partial<Entry>
): Promise<Entry> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  const now = new Date().toISOString();
  const updateDoc = {
    ...updates,
    updatedAt: now,
  };

  await entriesCollection.updateOne(
    { collection, slug },
    { $set: updateDoc }
  );

  const entry = await entriesCollection.findOne({ collection, slug });
  if (!entry) {
    throw new Error(`Entry not found: ${slug}`);
  }

  return entry as unknown as Entry;
}

/**
 * Delete an entry
 */
export async function deleteEntry(
  collection: string,
  slug: string
): Promise<void> {
  const db = await getDb();
  const entriesCollection = db.collection(Collections.ENTRIES);

  await entriesCollection.deleteOne({ collection, slug });
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

  const entries = await entriesCollection
    .find(filter)
    .sort({ publishedAt: -1, createdAt: -1 })
    .toArray();

  return entries as unknown as Entry[];
}

