/**
 * Loading skeleton for site pages (homepage, category pages)
 * Shows instantly during navigation while content loads
 */
export default function SiteLoading() {
  return (
    <main className="animate-pulse">
      {/* Hero skeleton */}
      <div className="h-64 bg-zinc-100 dark:bg-zinc-900" />

      {/* Category tabs skeleton */}
      <div className="px-4 py-6">
        <div className="flex gap-4 justify-center mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div 
              key={i} 
              className="h-8 w-20 bg-zinc-100 dark:bg-zinc-900 rounded"
            />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded" />
              <div className="h-4 bg-zinc-100 dark:bg-zinc-900 rounded" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

