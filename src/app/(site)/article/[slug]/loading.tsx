/**
 * Loading state for article pages
 * Maintains layout to prevent shift, no fake content placeholders
 */
export default function ArticleLoading() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Back button space */}
      <div className="h-4" />

      {/* Article header space */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-4xl px-8 pt-24 lg:pt-32 pb-20">
          <div className="flex flex-col items-center text-center gap-4">
            {/* Title space */}
            <div className="h-12" />
            {/* Meta space */}
            <div className="h-4" />
            {/* Excerpt space */}
            <div className="h-16" />
          </div>
        </div>

        {/* Content space */}
        <div className="w-full max-w-[1024px] px-4 pb-16">
          <div className="min-h-[50vh]" />
        </div>
      </div>
    </main>
  );
}

