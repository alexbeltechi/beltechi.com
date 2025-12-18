import { CategoryTabs } from "@/components/site/category-tabs";
import { PostGrid } from "@/components/site/post-grid";
import { getPublishedEntries } from "@/lib/cms/entries";
import { getMediaByIds } from "@/lib/cms/media";
import type { MediaItem } from "@/lib/cms/types";
import { notFound } from "next/navigation";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  // Fetch all published posts
  const allPosts = await getPublishedEntries("posts");

  // Get unique categories
  const allCategories = Array.from(
    new Set(allPosts.map((p) => p.data.category as string).filter(Boolean))
  );

  // Validate category exists
  const categoryLower = category.toLowerCase();
  const matchedCategory = allCategories.find(
    (c) => c.toLowerCase() === categoryLower
  );

  if (!matchedCategory) {
    notFound();
  }

  // Filter posts by category
  const posts = allPosts.filter(
    (p) => (p.data.category as string)?.toLowerCase() === categoryLower
  );

  // Get media for posts
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
      <CategoryTabs categories={allCategories} />
      <PostGrid posts={posts} mediaMap={mediaMap} />
    </main>
  );
}






