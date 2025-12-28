import { NextResponse } from "next/server";
import { listEntries } from "@/lib/db/entries";
import { getCollection } from "@/lib/cms/schema";

// GET /api/content/[collection] - List published entries
export async function GET(
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

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Only return published entries for public API
  const { entries, total } = await listEntries(collection, {
    status: "published",
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
}






