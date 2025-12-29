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
  // Fetch published posts, articles, and categories in parallel
  const [posts, articles, allCategories] = await Promise.all([
    getPublishedEntries("posts"),
    getPublishedEntries("articles"),
    listCategories(),
  ]);

  // Combine posts and articles, sort by date (newest first)
  const allEntries = [...posts, ...articles].sort((a, b) => {
    const dateA = new Date(a.data.date as string || a.createdAt).getTime();
    const dateB = new Date(b.data.date as string || b.createdAt).getTime();
    return dateB - dateA;
  });

  // Get all unique media IDs from posts
  const allMediaIds = new Set<string>();
  
  // From posts - use media array
  posts.forEach((post) => {
    const mediaIds = post.data.media as string[] | undefined;
    if (mediaIds) {
      mediaIds.forEach((id) => allMediaIds.add(id));
    }
  });
  
  // From articles - use coverImage
  articles.forEach((article) => {
    const coverImageId = article.data.coverImage as string | undefined;
    if (coverImageId) {
      allMediaIds.add(coverImageId);
    }
  });

  // Fetch media items
  const mediaItems = await getMediaByIds(Array.from(allMediaIds));
  const mediaMap = new Map<string, MediaItem>(
    mediaItems.map((item) => [item.id, item])
  );

  // Get unique category IDs from all entries
  const entryCategoryIds = new Set(
    allEntries.flatMap((entry) => {
      const cats = entry.data.categories as string[] | undefined;
      return cats || [];
    })
  );

  // Categories for tabs (only those shown on homepage)
  const tabCategories = allCategories
    .filter((cat) => entryCategoryIds.has(cat.id) && cat.showOnHomepage !== false)
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  // All categories used in entries (for label lookup in grid)
  const allEntryCategories = allCategories
    .filter((cat) => entryCategoryIds.has(cat.id))
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  return (
    <main>
      {/* Hero Section */}
      <HeroSection />
      
      {/* Category Tabs + Masonry Grid */}
      <CategoryTabs categories={tabCategories} />
      <PostGrid posts={allEntries} mediaMap={mediaMap} categories={allEntryCategories} />
      
      {/* Services/About Section */}
      <ServicesSection />
    </main>
  );
}

