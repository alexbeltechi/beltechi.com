import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getEntry, updateEntry, deleteEntry } from "@/lib/db/entries";
import { getCollection } from "@/lib/cms/schema";

// GET /api/admin/collections/[collection]/entries/[slug] - Get single entry (any status)
export async function GET(
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

  const entry = await getEntry(collection, slug);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ data: entry });
}

// PATCH /api/admin/collections/[collection]/entries/[slug] - Update entry
// Body can include `publish: true` to push changes live (for published entries)
export async function PATCH(
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

  try {
    const body = await request.json();

    const result = await updateEntry(collection, slug, {
      slug: body.slug,
      status: body.status,
      data: body.data,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Revalidate public pages when publishing
    if (result.entry?.status === "published") {
      revalidatePath("/", "layout");
      revalidatePath(`/post/${result.entry?.slug || slug}`, "page");
    }

    return NextResponse.json({ data: result.entry });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// DELETE /api/admin/collections/[collection]/entries/[slug] - Delete entry
export async function DELETE(
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

  // Get entry before deleting to check if it was published
  const entry = await getEntry(collection, slug);
  const wasPublished = entry?.status === "published";

  const result = await deleteEntry(collection, slug);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  // Revalidate public pages if the entry was published
  if (wasPublished) {
    revalidatePath("/", "layout");
  }

  return NextResponse.json({ success: true });
}






