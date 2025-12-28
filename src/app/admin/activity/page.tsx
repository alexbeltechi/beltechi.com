import Link from "next/link";
import { FileText, Image, Clock } from "lucide-react";
import { listEntries } from "@/lib/db/entries";
import { listMedia } from "@/lib/cms/media";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ActivityPage() {
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
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Activity</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview and recent changes</p>
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

