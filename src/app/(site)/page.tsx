import { CategoryTabs } from "@/components/site/category-tabs";
import { PostGrid } from "@/components/site/post-grid";
import { HeroSection } from "@/components/site/hero-section";
import { ServicesSection } from "@/components/site/services-section";
import { getPublishedEntries } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/db/categories";
import type { MediaItem } from "@/lib/cms/types";

// Force dynamic rendering to avoid MongoDB connection during build
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch published posts and categories in parallel
  const [posts, allCategories] = await Promise.all([
    getPublishedEntries("posts"),
    listCategories(),
  ]);

  // Get all unique media IDs
  const allMediaIds = new Set<string>();
  posts.forEach((post) => {
    const mediaIds = post.data.media as string[] | undefined;
    if (mediaIds) {
      mediaIds.forEach((id) => allMediaIds.add(id));
    }
  });

  // Fetch media items
  const mediaItems = await getMediaByIds(Array.from(allMediaIds));
  const mediaMap = new Map<string, MediaItem>(
    mediaItems.map((item) => [item.id, item])
  );

  // Get unique category IDs from posts
  const postCategoryIds = new Set(
    posts.flatMap((p) => {
      const cats = p.data.categories as string[] | undefined;
      return cats || [];
    })
  );

  // Categories for tabs (only those shown on homepage)
  const tabCategories = allCategories
    .filter((cat) => postCategoryIds.has(cat.id) && cat.showOnHomepage !== false)
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  // All categories used in posts (for label lookup in grid)
  const allPostCategories = allCategories
    .filter((cat) => postCategoryIds.has(cat.id))
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  return (
    <main>
      {/* Hero Section */}
      <HeroSection />
      
      {/* Category Tabs + Masonry Grid */}
      <CategoryTabs categories={tabCategories} />
      <PostGrid posts={posts} mediaMap={mediaMap} categories={allPostCategories} />
      
      {/* Services/About Section */}
      <ServicesSection />
    </main>
  );
}

