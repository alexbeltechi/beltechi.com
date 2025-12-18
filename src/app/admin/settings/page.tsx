"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your CMS settings
        </p>
      </div>

      {/* Collections Info */}
      <Card>
        <CardHeader>
          <CardTitle>Collections</CardTitle>
          <CardDescription>
            Content types are defined in schema files. Edit these files to
            customize fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted rounded-lg border">
            <code className="text-sm text-emerald-600 dark:text-emerald-400 font-medium break-all">
              content/collections/posts.schema.json
            </code>
            <p className="text-xs text-muted-foreground mt-1">
              Instagram-style posts with carousel media
            </p>
          </div>

          <div className="p-3 bg-muted rounded-lg border">
            <code className="text-sm text-emerald-600 dark:text-emerald-400 font-medium break-all">
              content/collections/articles.schema.json
            </code>
            <p className="text-xs text-muted-foreground mt-1">
              Long-form articles with block editor
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
          <CardDescription>
            Content is stored as JSON files in the filesystem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b gap-1">
            <span className="text-sm text-muted-foreground">Entries</span>
            <Badge variant="secondary" className="w-fit font-mono text-xs">
              content/entries/
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b gap-1">
            <span className="text-sm text-muted-foreground">Media</span>
            <Badge variant="secondary" className="w-fit font-mono text-xs">
              public/uploads/
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-3 gap-1">
            <span className="text-sm text-muted-foreground">Categories</span>
            <Badge variant="secondary" className="w-fit font-mono text-xs">
              content/categories.json
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* API Info */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>
            Public and admin API endpoints for headless usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium text-sm mb-3">Public API</h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 font-mono text-xs">
                  GET /api/content/[collection]
                </Badge>
                <span className="text-xs text-muted-foreground">List published entries</span>
              </div>
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 font-mono text-xs">
                  GET /api/content/[collection]/[slug]
                </Badge>
                <span className="text-xs text-muted-foreground">Get single entry</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium text-sm mb-3">Admin API</h3>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 font-mono text-xs">
                  GET/POST /api/admin/categories
                </Badge>
                <span className="text-xs text-muted-foreground">List/create categories</span>
              </div>
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 font-mono text-xs">
                  PATCH/DELETE /api/admin/categories/[id]
                </Badge>
                <span className="text-xs text-muted-foreground">Update/delete category</span>
              </div>
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 font-mono text-xs break-all">
                  GET/POST /api/admin/collections/[col]/entries
                </Badge>
                <span className="text-xs text-muted-foreground">List/create entries</span>
              </div>
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 font-mono text-xs">
                  GET/POST /api/admin/media
                </Badge>
                <span className="text-xs text-muted-foreground">List/upload media</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
