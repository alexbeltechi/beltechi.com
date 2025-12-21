"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ImagePlus, Plus, X } from "lucide-react";
import type { PageBlock } from "@/lib/cms/page-blocks";
import {
  spacingOptions,
  columnOptions,
  aspectRatioOptions,
  buttonVariantOptions,
  dividerStyleOptions,
  textAlignmentOptions,
  type SpacingKey,
} from "@/lib/design-tokens";
import { MediaPicker } from "@/components/admin/media-picker";

interface BlockEditorProps {
  block: PageBlock;
  onChange: (updates: Partial<PageBlock>) => void;
  isMobile?: boolean;
}

export function BlockEditor({ block, onChange, isMobile }: BlockEditorProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<"single" | "gallery">("single");

  // Helper to update nested data
  const updateData = (key: string, value: unknown) => {
    onChange({
      data: { ...block.data, [key]: value },
    } as Partial<PageBlock>);
  };

  // Helper to update mobile overrides
  const updateMobile = (key: string, value: unknown) => {
    onChange({
      mobile: { ...block.mobile, [key]: value },
    } as Partial<PageBlock>);
  };

  // Render spacing controls
  const renderSpacingControls = () => (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
        Spacing
        <ChevronDown className="h-4 w-4" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        <div className="space-y-2">
          <Label className="text-xs">Margin Top</Label>
          <Select
            value={block.marginTop || "none"}
            onValueChange={(v) => onChange({ marginTop: v as SpacingKey })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Margin Bottom</Label>
          <Select
            value={block.marginBottom || "md"}
            onValueChange={(v) => onChange({ marginBottom: v as SpacingKey })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  // Block-specific editors
  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={block.data.title}
              onChange={(e) => updateData("title", e.target.value)}
              placeholder="Page title..."
            />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Textarea
              value={block.data.subtitle || ""}
              onChange={(e) => updateData("subtitle", e.target.value)}
              placeholder="Optional subtitle..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Alignment</Label>
            <Select
              value={block.data.alignment || "left"}
              onValueChange={(v) => updateData("alignment", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {textAlignmentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderSpacingControls()}
        </div>
      );

    case "text":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={block.data.content}
              onChange={(e) => updateData("content", e.target.value)}
              placeholder="Enter text content..."
              rows={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Alignment</Label>
            <Select
              value={block.data.alignment || "left"}
              onValueChange={(v) => updateData("alignment", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {textAlignmentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderSpacingControls()}
        </div>
      );

    case "image":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Image</Label>
            {block.data.mediaId ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground flex-1 truncate">
                  {block.data.mediaId}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMediaPickerTarget("single");
                    setShowMediaPicker(true);
                  }}
                >
                  Change
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateData("mediaId", "")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMediaPickerTarget("single");
                  setShowMediaPicker(true);
                }}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Select Image
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label>Caption</Label>
            <Input
              value={block.data.caption || ""}
              onChange={(e) => updateData("caption", e.target.value)}
              placeholder="Optional caption..."
            />
          </div>
          <div className="space-y-2">
            <Label>Alt Text</Label>
            <Input
              value={block.data.alt || ""}
              onChange={(e) => updateData("alt", e.target.value)}
              placeholder="Describe the image..."
            />
          </div>
          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <Select
              value={block.data.aspectRatio || "auto"}
              onValueChange={(v) => updateData("aspectRatio", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aspectRatioOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Full Width</Label>
            <Switch
              checked={block.data.fullWidth || false}
              onCheckedChange={(v) => updateData("fullWidth", v)}
            />
          </div>
          {renderSpacingControls()}

          {/* Media Picker Dialog */}
          <MediaPicker
            isOpen={showMediaPicker && mediaPickerTarget === "single"}
            onClose={() => setShowMediaPicker(false)}
            onSelect={(items) => {
              if (items.length > 0) {
                updateData("mediaId", items[0].id);
              }
              setShowMediaPicker(false);
            }}
            multiple={false}
            accept={["image/*"]}
          />
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Images ({block.data.mediaIds.length})</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setMediaPickerTarget("gallery");
                setShowMediaPicker(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Images
            </Button>
            {block.data.mediaIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {block.data.mediaIds.map((id, i) => (
                  <span
                    key={i}
                    className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1"
                  >
                    {id.slice(0, 6)}...
                    <button
                      onClick={() =>
                        updateData(
                          "mediaIds",
                          block.data.mediaIds.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Columns (Desktop)</Label>
            <Select
              value={String(block.data.columns)}
              onValueChange={(v) => updateData("columns", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columnOptions.map((col) => (
                  <SelectItem key={col} value={String(col)}>
                    {col} {col === 1 ? "Column" : "Columns"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Gap</Label>
            <Select
              value={block.data.gap}
              onValueChange={(v) => updateData("gap", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spacingOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile overrides */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
              Mobile Settings
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">Columns (Mobile)</Label>
                <Select
                  value={String(block.mobile?.columns || 1)}
                  onValueChange={(v) => updateMobile("columns", Number(v))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Column</SelectItem>
                    <SelectItem value="2">2 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Gap (Mobile)</Label>
                <Select
                  value={block.mobile?.gap || block.data.gap}
                  onValueChange={(v) => updateMobile("gap", v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {spacingOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {renderSpacingControls()}

          {/* Media Picker Dialog */}
          <MediaPicker
            isOpen={showMediaPicker && mediaPickerTarget === "gallery"}
            onClose={() => setShowMediaPicker(false)}
            onSelect={(items) => {
              updateData("mediaIds", [
                ...block.data.mediaIds,
                ...items.map((i) => i.id),
              ]);
              setShowMediaPicker(false);
            }}
            multiple={true}
            accept={["image/*"]}
          />
        </div>
      );

    case "divider":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Style</Label>
            <Select
              value={block.data.style}
              onValueChange={(v) => updateData("style", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dividerStyleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderSpacingControls()}
        </div>
      );

    case "quote":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Quote Text</Label>
            <Textarea
              value={block.data.text}
              onChange={(e) => updateData("text", e.target.value)}
              placeholder="Enter quote..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Attribution</Label>
            <Input
              value={block.data.attribution || ""}
              onChange={(e) => updateData("attribution", e.target.value)}
              placeholder="Who said this?"
            />
          </div>
          <div className="space-y-2">
            <Label>Alignment</Label>
            <Select
              value={block.data.alignment || "left"}
              onValueChange={(v) => updateData("alignment", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {textAlignmentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderSpacingControls()}
        </div>
      );

    case "video":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              value={block.data.url}
              onChange={(e) => updateData("url", e.target.value)}
              placeholder="Paste YouTube or Vimeo URL..."
            />
            <p className="text-xs text-muted-foreground">
              Supports YouTube and Vimeo links
            </p>
          </div>
          <div className="space-y-2">
            <Label>Caption</Label>
            <Input
              value={block.data.caption || ""}
              onChange={(e) => updateData("caption", e.target.value)}
              placeholder="Optional caption..."
            />
          </div>
          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <Select
              value={block.data.aspectRatio || "16:9"}
              onValueChange={(v) => updateData("aspectRatio", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                <SelectItem value="1:1">1:1 (Square)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {renderSpacingControls()}
        </div>
      );

    case "button":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={block.data.label}
              onChange={(e) => updateData("label", e.target.value)}
              placeholder="Button text..."
            />
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={block.data.url}
              onChange={(e) => updateData("url", e.target.value)}
              placeholder="/page or https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Style</Label>
            <Select
              value={block.data.variant}
              onValueChange={(v) => updateData("variant", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {buttonVariantOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Alignment</Label>
            <Select
              value={block.data.alignment || "left"}
              onValueChange={(v) => updateData("alignment", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {textAlignmentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Open in New Tab</Label>
            <Switch
              checked={block.data.openInNewTab || false}
              onCheckedChange={(v) => updateData("openInNewTab", v)}
            />
          </div>
          {renderSpacingControls()}
        </div>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          No editor available for this block type.
        </div>
      );
  }
}

