/**
 * Loading state for post pages
 * Empty shell - maintains layout structure for instant navigation
 * Images will show blur placeholders via their own loading states
 */
export default function PostLoading() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Back button space */}
      <div className="fixed top-4 left-4 z-50 w-10 h-10" />
      
      {/* Carousel space */}
      <div className="w-full h-[90vh] lg:h-[90vh]" />
      
      {/* Post info space */}
      <div className="w-full flex flex-col items-center gap-2 px-4 py-4">
        <div className="h-8" />
        <div className="h-6" />
        <div className="h-4" />
      </div>
    </main>
  );
}

