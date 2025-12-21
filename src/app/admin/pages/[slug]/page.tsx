"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageEditor } from "@/components/admin/page-editor";
import type { PageData } from "@/lib/cms/page-blocks";
import type { Entry } from "@/lib/cms/types";

export default function EditPagePage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [page, setPage] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch(`/api/admin/collections/pages/entries/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Page not found");
          } else {
            setError("Failed to load page");
          }
          return;
        }
        const data = await res.json();
        setPage(data.entry);
      } catch (err) {
        console.error("Failed to fetch page:", err);
        setError("Failed to load page");
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{error || "Page not found"}</p>
      </div>
    );
  }

  // Convert entry data to PageData format
  const pageData: PageData = {
    title: (page.data.title as string) || "",
    slug: page.slug,
    description: (page.data.description as string) || "",
    blocks: (page.data.blocks as PageData["blocks"]) || [],
    settings: (page.data.settings as PageData["settings"]) || {},
  };

  return <PageEditor initialData={pageData} isNew={false} />;
}

