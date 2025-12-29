"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Loader2,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { MediaItem } from "@/lib/cms/types";

interface UsageInfo {
  collection: string;
  slug: string;
  title: string;
}

interface MediaDetailModalProps {
  mediaId: string | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onReplace?: (id: string) => void;
  showDelete?: boolean;
  showReplace?: boolean;
  onNavigate?: (direction: "prev" | "next") => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

export function MediaDetailModal({
  mediaId,
  onClose,
  onDelete,
  onReplace,
  showDelete = false,
  showReplace = false,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
}: MediaDetailModalProps) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usages, setUsages] = useState<UsageInfo[]>([]);

  // Editable fields
  const [editAlt, setEditAlt] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");

  // Fetch media item and usage info
  useEffect(() => {
    if (!mediaId) {
      setItem(null);
      setUsages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch(`/api/admin/media/${mediaId}`).then((res) => res.json()),
      fetch(`/api/admin/media/${mediaId}/usage`).then((res) => res.json()),
    ])
      .then(([mediaData, usageData]) => {
        if (mediaData.data) {
          setItem(mediaData.data);
          setEditAlt(mediaData.data.alt || "");
          setEditTitle(mediaData.data.title || "");
          setEditCaption(mediaData.data.caption || "");
          setEditDescription(mediaData.data.description || "");
          setEditTags((mediaData.data.tags || []).join(", "));
        }
        setUsages(usageData.usages || []);
      })
      .catch((err) => {
        console.error("Failed to fetch media:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [mediaId]);

  const handleVariantChange = async (variant: string) => {
    if (!item) return;

    try {
      const res = await fetch(`/api/admin/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeVariant: variant }),
      });

      if (!res.ok) throw new Error("Failed to update");

      const updated = await res.json();
      setItem(updated.data);
    } catch (error) {
      console.error("Failed to change variant:", error);
      alert("Failed to change image size");
    }
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alt: editAlt,
          title: editTitle,
          caption: editCaption,
          description: editDescription,
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      const updated = await res.json();
      setItem(updated.data);
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm("Are you sure you want to delete this file permanently?")) return;

    try {
      const res = await fetch(`/api/admin/media/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.updatedEntries && data.updatedEntries > 0) {
          alert(`File deleted. References removed from ${data.updatedEntries} post(s)/article(s).`);
        }
      }
      onDelete?.(item.id);
      onClose();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete file");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!mediaId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal - wider with dark theme support */}
      <div className="relative bg-background border border-border rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-foreground">Attachment details</h2>
          <div className="flex items-center gap-1">
            {onNavigate && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate("prev")}
                  disabled={!canNavigatePrev}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate("next")}
                  disabled={!canNavigateNext}
                  className="h-8 w-8"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 ml-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !item ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Media not found</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row">
              {/* Image Preview - Left side (wider) */}
              <div className="lg:flex-[2] p-4 lg:p-8 flex items-center justify-center bg-muted min-h-[300px] lg:min-h-[600px]">
                {item.mime.startsWith("image/") ? (
                  <img
                    src={item.original?.url || item.url}
                    alt={item.alt || item.originalName}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <video
                    src={item.url}
                    poster={item.poster?.url}
                    controls
                    className="max-w-full max-h-[70vh] rounded-lg"
                  />
                )}
              </div>

              {/* Details - Right side */}
              <div className="lg:w-[400px] shrink-0 p-4 lg:p-6 border-t lg:border-t-0 lg:border-l border-border space-y-4 overflow-auto max-h-[50vh] lg:max-h-none">
                {/* File Info */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium text-foreground">Uploaded:</span>{" "}
                    {new Date(item.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">File name:</span>{" "}
                    {item.originalName}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">File type:</span> {item.mime}
                  </p>
                  {(item.width && item.height) && (
                    <p>
                      <span className="font-medium text-foreground">File dimensions:</span>{" "}
                      {item.width} × {item.height} px
                    </p>
                  )}
                  <p>
                    <span className="font-medium text-foreground">File size:</span>{" "}
                    {formatFileSize(item.size)}
                  </p>
                  {/* Usage info */}
                  <div className="flex items-start gap-1 pt-1">
                    {usages.length > 0 ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-emerald-500">
                          In use:{" "}
                          {usages.map((usage, idx) => (
                            <span key={`${usage.collection}-${usage.slug}`}>
                              <Link
                                href={`/admin/content/${usage.collection}/${usage.slug}`}
                                className="underline hover:text-emerald-400"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {usage.title}
                              </Link>
                              {idx < usages.length - 1 && ", "}
                            </span>
                          ))}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unused</span>
                    )}
                  </div>
                </div>

                {/* Image Size Selector */}
                {item.mime.startsWith("image/") && item.variants?.thumb && (
                  <div className="pt-2 border-t border-border">
                    <Label className="text-xs mb-2 block">Image Size</Label>
                    <div className="space-y-1.5">
                      <VariantButton
                        name="Display"
                        variant="display"
                        activeVariant={item.activeVariant || "display"}
                        width={item.variants.display?.width || item.width || 0}
                        height={item.variants.display?.height || item.height || 0}
                        size={item.variants.display?.size || item.size}
                        onSelect={() => handleVariantChange("display")}
                      />
                      <VariantButton
                        name="Thumbnail"
                        variant="thumb"
                        activeVariant={item.activeVariant || "display"}
                        width={item.variants.thumb.width}
                        height={item.variants.thumb.height}
                        size={item.variants.thumb.size}
                        onSelect={() => handleVariantChange("thumb")}
                      />
                    </div>
                  </div>
                )}

                {/* Editable Fields */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <Label className="text-xs mb-1 block">Alternative Text</Label>
                    <Textarea
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      placeholder="Describe this image for screen readers"
                      rows={2}
                      className="resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Leave empty if the image is purely decorative.
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">Title</Label>
                    <Input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Image title"
                    />
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">Caption</Label>
                    <Textarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Caption displayed below image"
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">Description</Label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Longer description for the image"
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">Tags</Label>
                    <Input
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="name, company, place"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Internal tags for organizing and filtering media
                    </p>
                  </div>
                </div>

                {/* File URL */}
                <div className="pt-2 border-t border-border">
                  <Label className="text-xs mb-1 block">File URL</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={item.url}
                      readOnly
                      className="flex-1 text-xs bg-muted truncate"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(item.url)}
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      asChild
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4 border-t border-border">
                  {showReplace && onReplace && (
                    <Button
                      variant="outline"
                      onClick={() => onReplace(item.id)}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Replace image
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Save changes
                    </Button>
                    {showDelete && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={handleDelete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface VariantButtonProps {
  name: string;
  variant: string;
  activeVariant: string;
  width: number;
  height: number;
  size: number;
  onSelect: () => void;
}

function VariantButton({
  name,
  variant,
  activeVariant,
  width,
  height,
  size,
  onSelect,
}: VariantButtonProps) {
  const isActive = activeVariant === variant;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground hover:bg-accent"
      }`}
    >
      <span className="font-medium">{name}</span>
      <span className={isActive ? "opacity-70" : ""}>
        {width}×{height} · {formatFileSize(size)}
      </span>
    </button>
  );
}
