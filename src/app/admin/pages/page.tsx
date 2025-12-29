"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  File,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 20;
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/lib";
import type { Entry } from "@/lib/cms/types";

export default function PagesListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination
  const totalPages = Math.ceil(pages.length / ITEMS_PER_PAGE);
  const paginatedPages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return pages.slice(start, start + ITEMS_PER_PAGE);
  }, [pages, currentPage]);

  // Fetch pages
  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await fetch("/api/admin/collections/pages/entries");
        if (res.ok) {
          const data = await res.json();
          setPages(data.entries || []);
        }
      } catch (error) {
        console.error("Failed to fetch pages:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPages();
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    
    setDeleting(slug);
    try {
      const res = await fetch(`/api/admin/collections/pages/entries/${slug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPages(pages.filter((p) => p.slug !== slug));
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - 56px tall */}
      <div className="border-b px-4 h-14 flex items-center shrink-0">
        <PageHeader title="Pages" count={pages.length}>
          <Button asChild>
            <Link href="/admin/pages/new">
              <Plus className="mr-2 h-4 w-4" />
              New Page
            </Link>
          </Button>
        </PageHeader>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <File className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No pages yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first page to get started
            </p>
            <Button asChild>
              <Link href="/admin/pages/new">
                <Plus className="mr-2 h-4 w-4" />
                New Page
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {paginatedPages.map((page) => (
              <div
                key={page.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/pages/${page.slug}`}
                    className="font-medium hover:underline block truncate"
                  >
                    {(page.data.title as string) || "Untitled Page"}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">
                    /{page.slug}
                  </p>
                </div>

                {/* Status */}
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    page.status === "published"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {page.status}
                </span>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      {deleting === page.slug ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreVertical className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/admin/pages/${page.slug}`)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {page.status === "published" && (
                      <DropdownMenuItem asChild>
                        <Link href={`/${page.slug}`} target="_blank">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Page
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDelete(page.slug)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="py-3 flex items-center justify-between px-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="ghost"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

