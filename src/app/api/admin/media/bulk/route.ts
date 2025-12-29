import { NextResponse } from "next/server";
import { getMediaByIds } from "@/lib/db/media";

// GET /api/admin/media/bulk?ids=id1,id2,id3
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json(
        { error: "ids parameter is required" },
        { status: 400 }
      );
    }

    const ids = idsParam.split(",").filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const items = await getMediaByIds(ids);

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("Bulk media fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch media items" },
      { status: 500 }
    );
  }
}

