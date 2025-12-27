"use client";

import { AlertTriangle } from "lucide-react";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  isPublished?: boolean; // If true, show "Save Changes" instead of "Save Draft"
}

export function UnsavedChangesModal({
  isOpen,
  onDiscard,
  onSave,
  onCancel,
  isSaving = false,
  isPublished = false,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  const saveButtonText = isPublished ? "Save Changes" : "Save Draft";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-900">
              Unsaved Changes
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              You have unsaved changes. What would you like to do?
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onSave}
            disabled={isSaving}
            style={{ backgroundColor: "#18181b", color: "#ffffff" }}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? "Saving..." : saveButtonText}
          </button>
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className="w-full px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            Discard Changes
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="w-full px-4 py-2.5 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}






