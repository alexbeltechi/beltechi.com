"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ArticleEditorForm } from "@/components/admin/article-editor-form";

function EditArticlePageContent() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="flex flex-col h-full max-w-[600px] mx-auto">
      {/* Mobile Header with Back Button */}
      <div className="border-b px-4 h-14 flex items-center gap-3 lg:hidden shrink-0">
        <Link
          href="/admin/content?collection=articles"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">Edit Article</h1>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-hidden">
        <ArticleEditorForm slug={slug} />
      </div>
    </div>
  );
}

export default function EditArticlePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditArticlePageContent />
    </Suspense>
  );
}
