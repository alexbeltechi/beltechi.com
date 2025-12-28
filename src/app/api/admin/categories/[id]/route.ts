import { NextRequest, NextResponse } from "next/server";
import {
  getCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/cms/categories";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/categories/[id] - Get single category
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const category = await getCategory(id);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: category });
  } catch (error) {
    console.error("Failed to get category:", error);
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: "Failed to get category" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/categories/[id] - Update category
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const category = await updateCategory(id, {
      label: body.label,
      color: body.color,
      description: body.description,
      showOnHomepage: body.showOnHomepage,
    });

    return NextResponse.json({ data: category });
  } catch (error) {
    console.error("Failed to update category:", error);
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update category" },
      { status: 400 }
    );
  }
}

// DELETE /api/admin/categories/[id] - Delete category
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    if (isDatabaseError(error)) {
      return handleDatabaseError(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete category" },
      { status: 400 }
    );
  }
}






