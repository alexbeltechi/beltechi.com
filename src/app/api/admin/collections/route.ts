import { NextResponse } from "next/server";
import { listCollections } from "@/lib/cms/schema";

// GET /api/admin/collections - List all collections
export async function GET() {
  const collections = await listCollections();

  return NextResponse.json({
    data: collections.map((col) => ({
      slug: col.slug,
      name: col.name,
      description: col.description,
    })),
  });
}






