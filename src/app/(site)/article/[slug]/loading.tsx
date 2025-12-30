/**
 * Loading skeleton for article pages
 * Shows instantly during navigation while article content loads
 */
export default function ArticleLoading() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 animate-pulse">
      {/* Back button skeleton */}
      <div className="h-4" />
      <div className="absolute left-4 top-4">
        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
      </div>

      {/* Article header skeleton */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-4xl px-8 pt-24 lg:pt-32 pb-20">
          <div className="flex flex-col items-center text-center gap-4">
            {/* Title */}
            <div className="w-3/4 h-12 bg-zinc-100 dark:bg-zinc-900 rounded" />
            
            {/* Meta */}
            <div className="flex gap-4">
              <div className="w-20 h-4 bg-zinc-100 dark:bg-zinc-900 rounded" />
              <div className="w-24 h-4 bg-zinc-100 dark:bg-zinc-900 rounded" />
            </div>
            
            {/* Excerpt */}
            <div className="w-full max-w-2xl space-y-2">
              <div className="w-full h-4 bg-zinc-100 dark:bg-zinc-900 rounded" />
              <div className="w-5/6 h-4 bg-zinc-100 dark:bg-zinc-900 rounded" />
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="w-full max-w-[1024px] px-4 pb-16 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-zinc-100 dark:bg-zinc-900 rounded" />
              <div className="h-4 bg-zinc-100 dark:bg-zinc-900 rounded w-11/12" />
              <div className="h-4 bg-zinc-100 dark:bg-zinc-900 rounded w-10/12" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

