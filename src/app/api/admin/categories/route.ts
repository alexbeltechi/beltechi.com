import { NextRequest, NextResponse } from "next/server";
import {
  listCategories,
  createCategory,
  reorderCategories,
} from "@/lib/cms/categories";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";

// GET /api/admin/categories - List all categories
export async function GET() {
  try {
    const categories = await listCategories();
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("Failed to list categories:", error);
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: "Failed to list categories" },
      { status: 500 }
    );
  }
}

// POST /api/admin/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.label) {
      return NextResponse.json(
        { error: "Label is required" },
        { status: 400 }
      );
    }

    const category = await createCategory({
      id: body.id,
      name: body.name || body.label,
      label: body.label || body.name,
      color: body.color || "#64748B",
      description: body.description,
      showOnHomepage: body.showOnHomepage ?? true,
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create category" },
      { status: 400 }
    );
  }
}

// PUT /api/admin/categories - Reorder categories
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.ids)) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    const categories = await reorderCategories(body.ids);
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("Failed to reorder categories:", error);
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: "Failed to reorder categories" },
      { status: 500 }
    );
  }
}






