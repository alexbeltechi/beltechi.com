"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Pencil, Plus, Copy, Star, Trash2, Check, RefreshCw } from "lucide-react";

interface ImageOptionsMenuProps {
  onEdit?: () => void;
  onCreatePost?: () => void;
  onCopyUrl?: () => void;
  onSetCover?: () => void;
  onReplace?: () => void;
  onDelete: () => void;
  isCover?: boolean;
  showCoverOption?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function ImageOptionsMenu({
  onEdit,
  onCreatePost,
  onCopyUrl,
  onDelete,
  onSetCover,
  onReplace,
  isCover = false,
  showCoverOption = false,
  className = "",
  onOpenChange,
}: ImageOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Wrapper to call onOpenChange when open state changes
  const setOpenWithCallback = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  // Calculate position when opening
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 160; // w-40 = 10rem = 160px
      
      // Position below the button, aligned to the right
      let left = rect.right - menuWidth;
      let top = rect.bottom + 4;
      
      // Ensure it doesn't go off-screen
      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      
      setPosition({ top, left });
    }
  }, [open]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpenWithCallback(false);
      }
    };

    const handleScroll = () => {
      setOpenWithCallback(false);
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const handleCopyUrl = () => {
    onCopyUrl?.();
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1000);
  };

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed w-40 bg-white border border-zinc-200 rounded-lg shadow-xl py-1 overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
    >
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
            setOpenWithCallback(false);
          }}
          className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2.5"
        >
          <Pencil className="w-4 h-4 text-zinc-500" />
          Edit
        </button>
      )}

      {onCreatePost && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCreatePost();
            setOpenWithCallback(false);
          }}
          className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2.5"
        >
          <Plus className="w-4 h-4 text-zinc-500" />
          Create post
        </button>
      )}

      {onCopyUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyUrl();
          }}
          className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2.5"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-zinc-500" />
              Copy URL
            </>
          )}
        </button>
      )}

      {showCoverOption && onSetCover && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!isCover) {
              setOpenWithCallback(false);
              onSetCover();
            }
          }}
          disabled={isCover}
          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 ${
            isCover
              ? "text-zinc-400 cursor-default"
              : "text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          <Star
            className={`w-4 h-4 ${isCover ? "fill-amber-400 text-amber-400" : "text-zinc-500"}`}
          />
          {isCover ? "Cover image" : "Set as cover"}
        </button>
      )}

      {onReplace && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReplace();
            setOpenWithCallback(false);
          }}
          className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2.5"
        >
          <RefreshCw className="w-4 h-4 text-zinc-500" />
          Replace
        </button>
      )}

      <div className="border-t border-zinc-100 my-1" />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
          setOpenWithCallback(false);
        }}
        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpenWithCallback(!open);
        }}
        className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-white" />
      </button>

      {open && typeof document !== "undefined" && createPortal(menuContent, document.body)}
    </div>
  );
}
