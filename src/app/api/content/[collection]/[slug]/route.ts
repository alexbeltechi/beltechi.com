import { NextResponse } from "next/server";
import { getEntry } from "@/lib/cms/entries";
import { getCollection } from "@/lib/cms/schema";

// GET /api/content/[collection]/[slug] - Get single published entry
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

  // Only return published entries for public API
  if (entry.status !== "published") {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ data: entry });
}






