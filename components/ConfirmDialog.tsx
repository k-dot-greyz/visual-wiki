"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur z-50" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <Dialog.Content
            aria-describedby="confirm-description"
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <Dialog.Title className="text-2xl font-semibold tracking-tight text-white">
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="text-zinc-400 hover:text-white p-1 rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description id="confirm-description" className="text-sm text-zinc-400 mb-8">
              {description}
            </Dialog.Description>
            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 h-12 border border-zinc-700 rounded-3xl text-zinc-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 h-12 bg-red-500 hover:bg-red-400 text-white rounded-3xl font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              >
                {confirmLabel}
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
