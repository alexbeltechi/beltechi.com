import fs from "fs/promises";
import path from "path";
import type { CollectionSchema } from "./types";

const COLLECTIONS_DIR = path.join(process.cwd(), "content", "collections");

// Cache for schemas (disabled in development to pick up changes)
let schemaCache: Map<string, CollectionSchema> | null = null;

/**
 * Load all collection schemas
 */
export async function loadSchemas(): Promise<Map<string, CollectionSchema>> {
  // Skip cache in development to pick up schema changes
  if (schemaCache && process.env.NODE_ENV === "production") {
    return schemaCache;
  }

  const cache = new Map<string, CollectionSchema>();

  try {
    const files = await fs.readdir(COLLECTIONS_DIR);
    const schemaFiles = files.filter((f) => f.endsWith(".schema.json"));

    for (const file of schemaFiles) {
      const content = await fs.readFile(
        path.join(COLLECTIONS_DIR, file),
        "utf-8"
      );
      const schema = JSON.parse(content) as CollectionSchema;
      cache.set(schema.slug, schema);
    }

    schemaCache = cache;
    return cache;
  } catch (error) {
    console.error("Failed to load schemas:", error);
    return cache;
  }
}

/**
 * Get a specific collection schema
 */
export async function getCollection(
  slug: string
): Promise<CollectionSchema | null> {
  const schemas = await loadSchemas();
  return schemas.get(slug) || null;
}

/**
 * List all collections
 */
export async function listCollections(): Promise<CollectionSchema[]> {
  const schemas = await loadSchemas();
  return Array.from(schemas.values());
}

/**
 * Clear schema cache (useful for development)
 */
export function clearSchemaCache(): void {
  schemaCache = null;
}

/**
 * Validate entry data against schema
 */
export function validateEntryData(
  schema: CollectionSchema,
  data: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of schema.fields) {
    const value = data[field.key];

    // Check required fields
    if (field.required) {
      if (value === undefined || value === null || value === "") {
        errors.push(`${field.label} is required`);
        continue;
      }

      // For arrays, check if empty
      if (Array.isArray(value) && value.length === 0) {
        errors.push(`${field.label} is required`);
        continue;
      }
    }

    // Type-specific validation
    if (value !== undefined && value !== null) {
      switch (field.type) {
        case "text":
        case "textarea":
        case "slug":
          if (typeof value !== "string") {
            errors.push(`${field.label} must be text`);
          }
          break;

        case "number":
          if (typeof value !== "number") {
            errors.push(`${field.label} must be a number`);
          }
          break;

        case "boolean":
          if (typeof value !== "boolean") {
            errors.push(`${field.label} must be true or false`);
          }
          break;

        case "media":
          if (typeof value !== "string") {
            errors.push(`${field.label} must be a media ID`);
          }
          break;

        case "media:list":
          if (!Array.isArray(value)) {
            errors.push(`${field.label} must be an array of media IDs`);
          } else if (field.max && value.length > field.max) {
            errors.push(`${field.label} can have at most ${field.max} items`);
          }
          break;

        case "blocks":
          if (!Array.isArray(value)) {
            errors.push(`${field.label} must be an array of blocks`);
          }
          break;

        case "select":
          if (field.options) {
            const validValues = field.options.map((o) => o.value);
            if (!validValues.includes(value as string)) {
              errors.push(`${field.label} must be one of: ${validValues.join(", ")}`);
            }
          }
          break;

        case "categories":
          if (!Array.isArray(value)) {
            errors.push(`${field.label} must be an array of category IDs`);
          }
          break;

        case "datetime":
          if (typeof value !== "string") {
            errors.push(`${field.label} must be a date string`);
          }
          break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

