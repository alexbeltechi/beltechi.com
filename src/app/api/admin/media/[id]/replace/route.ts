import { NextResponse } from "next/server";
import { uploadMedia, deleteMedia, replaceMediaReferences } from "@/lib/cms/media";

// POST /api/admin/media/[id]/replace - Replace media file and update all references
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: oldMediaId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Upload the new file
    const uploadResult = await uploadMedia(buffer, file.name, file.type);

    if (uploadResult.error || !uploadResult.item) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to upload file" },
        { status: 400 }
      );
    }

    const newMediaId = uploadResult.item.id;

    // 2. Replace all references from old ID to new ID
    const { updatedCount } = await replaceMediaReferences(oldMediaId, newMediaId);

    // 3. Delete the old media file
    await deleteMedia(oldMediaId);

    return NextResponse.json({
      data: uploadResult.item,
      updatedEntries: updatedCount,
    });
  } catch (error) {
    console.error("Replace error:", error);
    return NextResponse.json(
      { error: "Failed to replace file" },
      { status: 500 }
    );
  }
}

