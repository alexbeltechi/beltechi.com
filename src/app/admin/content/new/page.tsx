"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Image, FileText } from "lucide-react";

function NewContentPageContent() {
  const searchParams = useSearchParams();
  const preselectedType = searchParams.get("type");

  if (preselectedType) {
    // Redirect to the specific editor
    if (typeof window !== "undefined") {
      window.location.href = `/admin/content/${preselectedType}/new`;
    }
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/content"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Content
        </Link>
        <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">
          Create New Content
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          Choose the type of content you want to create
        </p>
      </div>

      {/* Type Selection */}
      <div className="grid gap-3 lg:gap-4">
        <Link
          href="/admin/content/posts/new"
          className="p-4 lg:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-blue-300 dark:hover:border-blue-500 transition-all group shadow-sm"
        >
          <div className="flex items-start gap-3 lg:gap-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Image className="w-6 h-6 lg:w-7 lg:h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base lg:text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Post
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Instagram-style content with photo and video carousels. Perfect
                for showcasing visual work.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400">
                  Carousel media
                </span>
                <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400">
                  Quick publish
                </span>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/content/articles/new"
          className="p-4 lg:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-purple-300 dark:hover:border-purple-500 transition-all group shadow-sm"
        >
          <div className="flex items-start gap-3 lg:gap-4">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 lg:w-7 lg:h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-base lg:text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Article
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Long-form editorial content with rich block editing. Great for
                tutorials, journals, and stories.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400">
                  Block editor
                </span>
                <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400">
                  SEO options
                </span>
                <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400">
                  Categories
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function NewContentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
      <NewContentPageContent />
    </Suspense>
  );
}
