import { NextResponse } from "next/server";
import { getMedia, updateMedia, deleteMedia } from "@/lib/cms/media";

// GET /api/admin/media/[id] - Get single media item
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const item = await getMedia(id);

  if (!item) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  return NextResponse.json({ data: item });
}

// PATCH /api/admin/media/[id] - Update media metadata
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // Support all updateable fields including activeVariant
    const result = await updateMedia(id, {
      alt: body.alt,
      title: body.title,
      caption: body.caption,
      description: body.description,
      activeVariant: body.activeVariant,
      tags: body.tags,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.item });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// DELETE /api/admin/media/[id] - Delete media
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await deleteMedia(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

