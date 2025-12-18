import { NextResponse } from "next/server";
import { getEntry, createEntry } from "@/lib/cms/entries";
import { getCollection } from "@/lib/cms/schema";

// POST /api/admin/collections/[collection]/entries/[slug]/duplicate - Duplicate entry
export async function POST(
  request: Request,
  { params }: { params: Promise<{ collection: string; slug: string }> }
) {
  const { collection, slug } = await params;

  // Validate collection exists
  const schema = await getCollection(collection);
  if (!schema) {
    return NextResponse.json(
      { error: `Collection "${collection}" not found` },
      { status: 404 }
    );
  }

  // Get the original entry
  const original = await getEntry(collection, slug);
  if (!original) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  try {
    // Create duplicate with modified title and as draft
    const originalTitle = (original.data.title as string) || original.slug;
    const newTitle = `${originalTitle} (Copy)`;
    
    // Generate a new slug based on the new title
    const baseSlug = newTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const result = await createEntry(collection, {
      title: newTitle,
      slug: baseSlug,
      status: "draft", // Always create as draft
      data: {
        ...original.data,
        title: newTitle,
      },
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      slug: result.entry?.slug,
      id: result.entry?.id,
      message: "Entry duplicated successfully",
    });
  } catch (error) {
    console.error("Failed to duplicate entry:", error);
    return NextResponse.json(
      { error: "Failed to duplicate entry" },
      { status: 500 }
    );
  }
}

