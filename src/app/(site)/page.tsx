import { CategoryTabs } from "@/components/site/category-tabs";
import { PostGrid } from "@/components/site/post-grid";
import { getPublishedEntries } from "@/lib/cms/entries";
import { getMediaByIds } from "@/lib/cms/media";
import type { MediaItem } from "@/lib/cms/types";

export default async function HomePage() {
  // Fetch published posts
  const posts = await getPublishedEntries("posts");

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

  // Get unique categories from posts
  const categories = Array.from(
    new Set(
      posts.flatMap((p) => {
        const cats = p.data.categories as string[] | undefined;
        return cats || [];
      })
    )
  );

  return (
    <main>
      <CategoryTabs categories={categories} />
      <PostGrid posts={posts} mediaMap={mediaMap} />
    </main>
  );
}

