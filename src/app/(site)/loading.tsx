/**
 * Loading state for site pages (homepage, category pages)
 * Maintains layout to prevent shift, images load with blur placeholders
 */
export default function SiteLoading() {
  return (
    <main>
      {/* Hero space */}
      <div className="h-64" />

      {/* Category tabs space */}
      <div className="px-4 py-6">
        <div className="h-8 mb-8" />

        {/* Grid space - maintains layout without fake content */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              {/* Image space */}
              <div className="aspect-square" />
              {/* Title/meta space */}
              <div className="h-4" />
              <div className="h-3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

