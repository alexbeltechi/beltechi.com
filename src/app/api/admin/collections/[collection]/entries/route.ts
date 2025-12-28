import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { listEntries, createEntry } from "@/lib/cms/entries";
import { getCollection } from "@/lib/cms/schema";
import type { EntryStatus } from "@/lib/cms/types";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";

// GET /api/admin/collections/[collection]/entries - List all entries (including drafts)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;

    // Validate collection exists
    const schema = await getCollection(collection);
    if (!schema) {
      return NextResponse.json(
        { error: `Collection "${collection}" not found` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status") as EntryStatus | null;

    const { entries, total } = await listEntries(collection, {
      status: status || undefined,
      limit,
      offset,
      sortField: schema.admin.defaultSort.field,
      sortDirection: schema.admin.defaultSort.direction,
    });

    return NextResponse.json({
      data: entries,
      total,
      limit,
      offset,
    });
  } catch (error) {
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    throw error;
  }
}

// POST /api/admin/collections/[collection]/entries - Create new entry
export async function POST(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params;

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

    const result = await createEntry(collection, {
      slug: body.slug,
      status: body.status || "draft",
      data: body.data || {},
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Revalidate public pages when publishing
    if (body.status === "published") {
      revalidatePath("/", "layout");
    }

    return NextResponse.json({ data: result.entry }, { status: 201 });
  } catch (error) {
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}






