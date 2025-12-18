import { CategoryTabs } from "@/components/site/category-tabs";
import { PostGrid } from "@/components/site/post-grid";
import { HeroSection } from "@/components/site/hero-section";
import { ServicesSection } from "@/components/site/services-section";
import { getPublishedEntries } from "@/lib/cms/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/cms/categories";
import type { MediaItem } from "@/lib/cms/types";

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

  // Filter categories to only those used in posts and shown on homepage, preserving their order
  const categories = allCategories
    .filter((cat) => postCategoryIds.has(cat.id) && cat.showOnHomepage !== false)
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  return (
    <main>
      {/* Hero Section */}
      <HeroSection />
      
      {/* Category Tabs + Masonry Grid */}
      <CategoryTabs categories={categories} />
      <PostGrid posts={posts} mediaMap={mediaMap} categories={categories} />
      
      {/* Services/About Section */}
      <ServicesSection />
    </main>
  );
}

