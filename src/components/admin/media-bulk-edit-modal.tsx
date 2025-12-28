"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { MediaItem } from "@/lib/cms/types";

interface MediaBulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMedia: MediaItem[];
  onSave: (updates: Partial<MediaItem>) => Promise<void>;
}

const MULTIPLE_VALUES = "Multiple values";

export function MediaBulkEditModal({
  open,
  onOpenChange,
  selectedMedia,
  onSave,
}: MediaBulkEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  // Track which fields were edited by the user
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  const markFieldAsEdited = (field: string) => {
    setEditedFields((prev) => new Set([...prev, field]));
  };

  // Check if field has multiple values across selected items
  const hasMultipleValues = (field: keyof MediaItem) => {
    if (selectedMedia.length === 0) return false;
    const firstValue = selectedMedia[0][field];
    return !selectedMedia.every((item) => {
      const itemValue = item[field];
      // Handle array comparison for tags
      if (Array.isArray(firstValue) && Array.isArray(itemValue)) {
        return JSON.stringify(firstValue) === JSON.stringify(itemValue);
      }
      return itemValue === firstValue;
    });
  };

  // Initialize form with values or "Multiple values" placeholder
  useEffect(() => {
    if (!open || selectedMedia.length === 0) return;

    console.log("=== MODAL INIT ===");
    console.log("Selected media:", selectedMedia.length);
    console.log("Has multiple alt values:", hasMultipleValues("alt"));
    console.log("Has multiple title values:", hasMultipleValues("title"));
    console.log("Has multiple tags values:", hasMultipleValues("tags"));
    
    // Log first few items' tags for debugging
    selectedMedia.slice(0, 3).forEach((item, i) => {
      console.log(`Item ${i} tags:`, item.tags);
    });

    // Reset edited fields when modal opens
    setEditedFields(new Set());

    // Alt text
    if (hasMultipleValues("alt")) {
      setAlt("");
    } else {
      setAlt(selectedMedia[0].alt || "");
    }

    // Title
    if (hasMultipleValues("title")) {
      setTitle("");
    } else {
      setTitle(selectedMedia[0].title || "");
    }

    // Caption
    if (hasMultipleValues("caption")) {
      setCaption("");
    } else {
      setCaption(selectedMedia[0].caption || "");
    }

    // Description
    if (hasMultipleValues("description")) {
      setDescription("");
    } else {
      setDescription(selectedMedia[0].description || "");
    }

    // Tags
    if (hasMultipleValues("tags")) {
      setTags("");
    } else {
      const firstTags = selectedMedia[0].tags || [];
      setTags(firstTags.join(", "));
    }
  }, [open, selectedMedia]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Partial<MediaItem> = {};

      // Only include fields that the user actually edited
      if (editedFields.has("alt")) {
        updates.alt = alt.trim();
      }
      if (editedFields.has("title")) {
        updates.title = title.trim();
      }
      if (editedFields.has("caption")) {
        updates.caption = caption.trim();
      }
      if (editedFields.has("description")) {
        updates.description = description.trim();
      }
      if (editedFields.has("tags")) {
        updates.tags = tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      console.log("Bulk edit - sending updates:", updates);
      console.log("Edited fields:", Array.from(editedFields));

      // Check if there are any updates to send
      if (Object.keys(updates).length === 0) {
        console.log("No updates to send - no fields were edited");
        onOpenChange(false);
        return;
      }

      await onSave(updates);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save changes:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const getPlaceholder = (field: keyof MediaItem) => {
    return hasMultipleValues(field) ? MULTIPLE_VALUES : "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-w-[calc(100%-32px)] p-0">
        {/* Header */}
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-base font-semibold">
            Edit details
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Editing {selectedMedia.length} {selectedMedia.length === 1 ? "item" : "items"}
          </p>

          {/* Alternative Text */}
          <div className="space-y-2">
            <Label htmlFor="alt">Alternative Text</Label>
            <Input
              id="alt"
              value={alt}
              onChange={(e) => {
                setAlt(e.target.value);
                markFieldAsEdited("alt");
              }}
              placeholder={getPlaceholder("alt") || "Describe this image for screen readers"}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markFieldAsEdited("title");
              }}
              placeholder={getPlaceholder("title")}
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                markFieldAsEdited("caption");
              }}
              placeholder={getPlaceholder("caption") || "Caption displayed below image"}
              rows={2}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                markFieldAsEdited("description");
              }}
              placeholder={getPlaceholder("description") || "Longer description for the image"}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => {
                setTags(e.target.value);
                markFieldAsEdited("tags");
              }}
              placeholder={getPlaceholder("tags") || "name, company, place"}
            />
            <p className="text-xs text-muted-foreground">
              Internal tags for organizing and filtering media
            </p>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t px-4 py-3 flex flex-row gap-2 justify-end">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

