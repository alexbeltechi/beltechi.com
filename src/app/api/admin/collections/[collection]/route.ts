import { NextResponse } from "next/server";
import { getCollection } from "@/lib/cms/schema";

// GET /api/admin/collections/[collection] - Get collection schema
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params;

  const schema = await getCollection(collection);

  if (!schema) {
    return NextResponse.json(
      { error: `Collection "${collection}" not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: schema });
}






