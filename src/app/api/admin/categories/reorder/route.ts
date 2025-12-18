import { NextResponse } from "next/server";
import { reorderCategories } from "@/lib/cms/categories";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids)) {
      return NextResponse.json(
        { error: "ids must be an array" },
        { status: 400 }
      );
    }

    const reordered = await reorderCategories(ids);

    return NextResponse.json({ data: reordered });
  } catch (error) {
    console.error("Failed to reorder categories:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reorder categories" },
      { status: 500 }
    );
  }
}
