import { CategoryTabs } from "@/components/site/category-tabs";
import { PostGrid } from "@/components/site/post-grid";
import { getPublishedEntries } from "@/lib/db/entries";
import { getMediaByIds } from "@/lib/cms/media";
import { listCategories } from "@/lib/db/categories";
import type { MediaItem } from "@/lib/cms/types";
import { notFound } from "next/navigation";

// Force dynamic rendering to avoid MongoDB connection during build
export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;

  // Fetch all published posts and categories in parallel
  const [allPosts, allCategoriesData] = await Promise.all([
    getPublishedEntries("posts"),
    listCategories(),
  ]);

  // Find the category by slug
  const matchedCategory = allCategoriesData.find(
    (c) => c.slug === categorySlug || c.id === categorySlug
  );

  if (!matchedCategory) {
    notFound();
  }

  // Filter posts that have this category in their categories array
  const posts = allPosts.filter((p) => {
    const postCategories = p.data.categories as string[] | undefined;
    return postCategories?.includes(matchedCategory.id);
  });

  // Get unique category IDs from all posts
  const postCategoryIds = new Set(
    allPosts.flatMap((p) => {
      const cats = p.data.categories as string[] | undefined;
      return cats || [];
    })
  );

  // Categories for tabs (only those shown on homepage)
  const tabCategories = allCategoriesData
    .filter((cat) => postCategoryIds.has(cat.id) && cat.showOnHomepage !== false)
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  // All categories used in posts (for label lookup in grid)
  const allPostCategories = allCategoriesData
    .filter((cat) => postCategoryIds.has(cat.id))
    .map((cat) => ({ id: cat.id, slug: cat.slug, label: cat.label }));

  // Get media for filtered posts
  const allMediaIds = new Set<string>();
  posts.forEach((post) => {
    const mediaIds = post.data.media as string[] | undefined;
    if (mediaIds) {
      mediaIds.forEach((id) => allMediaIds.add(id));
    }
  });

  const mediaItems = await getMediaByIds(Array.from(allMediaIds));
  const mediaMap = new Map<string, MediaItem>(
    mediaItems.map((item) => [item.id, item])
  );

  return (
    <main>
      <CategoryTabs categories={tabCategories} />
      <PostGrid posts={posts} mediaMap={mediaMap} categories={allPostCategories} />
    </main>
  );
}






