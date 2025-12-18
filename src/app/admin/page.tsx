import Link from "next/link";
import { Plus, FileText, Image, Clock } from "lucide-react";
import { listEntries } from "@/lib/cms/entries";
import { listMedia } from "@/lib/cms/media";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  // Fetch stats
  const [postsResult, articlesResult, mediaResult] = await Promise.all([
    listEntries("posts", { limit: 5 }),
    listEntries("articles", { limit: 5 }),
    listMedia({ limit: 1 }),
  ]);

  const postsDraft = postsResult.entries.filter((e) => e.status === "draft").length;
  const articlesPublished = articlesResult.entries.filter((e) => e.status === "published").length;

  const recentEntries = [...postsResult.entries, ...articlesResult.entries]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back</p>
        </div>
        <Button asChild className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
          <Link href="/admin/content/new">
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Posts"
          value={postsResult.total}
          subtitle={`${postsDraft} drafts`}
          icon={FileText}
          href="/admin/content?tab=posts"
        />
        <StatCard
          title="Articles"
          value={articlesResult.total}
          subtitle={`${articlesPublished} published`}
          icon={FileText}
          href="/admin/content?tab=articles"
        />
        <StatCard
          title="Media"
          value={mediaResult.total}
          subtitle="Files uploaded"
          icon={Image}
          href="/admin/media"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="hover:border-foreground/20 transition-colors">
          <Link href="/admin/content/new?type=posts">
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Plus className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Create Post</h3>
                  <p className="text-sm text-muted-foreground">
                    Instagram-style with carousel
                  </p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-foreground/20 transition-colors">
          <Link href="/admin/content/new?type=articles">
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Plus className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Create Article</h3>
                  <p className="text-sm text-muted-foreground">
                    Long-form with rich blocks
                  </p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No content yet. Create your first post or article!
            </p>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/admin/content/${entry.collection}/${entry.slug}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        entry.status === "published"
                          ? "bg-emerald-500"
                          : entry.status === "draft"
                            ? "bg-amber-500"
                            : "bg-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {(entry.data.title as string) || entry.slug}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {entry.collection}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {formatRelativeTime(entry.updatedAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  className = "",
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  className?: string;
}) {
  return (
    <Card className={`hover:border-foreground/20 transition-colors ${className}`}>
      <Link href={href}>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{title}</span>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </CardContent>
      </Link>
    </Card>
  );
}
