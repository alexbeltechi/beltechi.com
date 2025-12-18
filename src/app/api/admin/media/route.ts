import { NextResponse } from "next/server";
import { listMedia, uploadMedia } from "@/lib/cms/media";

// GET /api/admin/media - List all media
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const mime = searchParams.get("mime") || undefined;

  const { items, total } = await listMedia({ limit, offset, mime });

  return NextResponse.json({
    data: items,
    total,
    limit,
    offset,
  });
}

// POST /api/admin/media - Upload new media with automatic optimization
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // uploadMedia now handles all image processing internally:
    // - Sanitizes filename
    // - Generates variants (display, large, medium, thumb)
    // - Preserves original
    // - Extracts dimensions
    const result = await uploadMedia(buffer, file.name, file.type);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.item }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
