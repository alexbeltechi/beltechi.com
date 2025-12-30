import { CategoryTabs } from "@/components/site/category-tabs";
import { PostGrid } from "@/components/site/post-grid";
import { getPublishedEntries } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/db/categories";
import type { MediaItem } from "@/lib/cms/types";
import { notFound } from "next/navigation";

// Use ISR - regenerate every 60 seconds for instant navigation
export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;

  // Fetch all published posts, articles, and categories in parallel
  const [allPosts, allArticles, allCategoriesData] = await Promise.all([
    getPublishedEntries("posts"),
    getPublishedEntries("articles"),
    listCategories(),
  ]);

  // Find the category by slug
  const matchedCategory = allCategoriesData.find(
    (c) => c.slug === categorySlug || c.id === categorySlug
  );

  if (!matchedCategory) {
    notFound();
  }

  // Combine posts and articles
  const allEntries = [...allPosts, ...allArticles];

  // Filter entries that have this category
  const filteredEntries = allEntries.filter((entry) => {
    const entryCategories = entry.data.categories as string[] | undefined;
    return entryCategories?.includes(matchedCategory.id);
  });

  // Sort by date (newest first)
  filteredEntries.sort((a, b) => {
    const dateA = new Date(a.data.date as string || a.createdAt).getTime();
    const dateB = new Date(b.data.date as string || b.createdAt).getTime();
    return dateB - dateA;
  });

  // Get unique category IDs from all entries
  const entryCategoryIds = new Set(
    allEntries.flatMap((entry) => {
      const cats = entry.data.categories as string[] | undefined;
      return cats || [];
    })
  );

  // Categories for tabs (only those shown on homepage)
  const tabCategories = allCategoriesData
    .filter((cat) => entryCategoryIds.has(cat.id) && cat.showOnHomepage !== false)
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  // All categories used in entries (for label lookup in grid)
  const allEntryCategories = allCategoriesData
    .filter((cat) => entryCategoryIds.has(cat.id))
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  // Get media for filtered entries
  const allMediaIds = new Set<string>();
  
  // From posts - use media array
  filteredEntries.forEach((entry) => {
    if (entry.collection === "posts") {
      const mediaIds = entry.data.media as string[] | undefined;
      if (mediaIds) {
        mediaIds.forEach((id) => allMediaIds.add(id));
      }
    } else if (entry.collection === "articles") {
      // From articles - use coverImage
      const coverImageId = entry.data.coverImage as string | undefined;
      if (coverImageId) {
        allMediaIds.add(coverImageId);
      }
    }
  });

  const mediaItems = await getMediaByIds(Array.from(allMediaIds));
  const mediaMap = new Map<string, MediaItem>(
    mediaItems.map((item) => [item.id, item])
  );

  return (
    <main>
      <CategoryTabs categories={tabCategories} />
      <PostGrid posts={filteredEntries} mediaMap={mediaMap} categories={allEntryCategories} />
    </main>
  );
}






