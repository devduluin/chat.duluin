"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DeleteConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  isPermanent?: boolean;
  loading?: boolean;
  showPermanentOption?: boolean;
  isMessageSender?: boolean;
  isGroupConversation?: boolean;
  onConfirm: (isPermanent: boolean) => void;
  onCancel: () => void;
  onTogglePermanent?: (value: boolean) => void;
};

export function DeleteConfirmDialog({
  open,
  title = "Delete Message",
  description = "Are you sure you want to delete this message?",
  isPermanent = false,
  loading = false,
  showPermanentOption = true,
  isMessageSender = false,
  isGroupConversation = false,
  onConfirm,
  onCancel,
  onTogglePermanent,
}: DeleteConfirmDialogProps) {
  const deleteForEveryoneLabel = isGroupConversation
    ? "Delete for everyone in this group"
    : "Delete for everyone";

  const deleteForMeLabel = "Delete for me only";

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()} // 👈 disables outside click
        onEscapeKeyDown={(e) => e.preventDefault()} // 👈 disables Escape key
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {showPermanentOption && isMessageSender && (
          <div className="space-y-3 pt-2">
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="delete-for-me"
                name="delete-option"
                checked={!isPermanent}
                onChange={() => onTogglePermanent?.(false)}
                className="cursor-pointer mt-1"
              />
              <label
                htmlFor="delete-for-me"
                className="text-sm cursor-pointer flex-1"
              >
                <div className="font-medium">{deleteForMeLabel}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Message will only be deleted from your view
                </div>
              </label>
            </div>
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="delete-for-everyone"
                name="delete-option"
                checked={isPermanent}
                onChange={() => onTogglePermanent?.(true)}
                className="cursor-pointer mt-1"
              />
              <label
                htmlFor="delete-for-everyone"
                className="text-sm cursor-pointer flex-1"
              >
                <div className="font-medium">{deleteForEveryoneLabel}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Message will be deleted for all participants
                </div>
              </label>
            </div>
          </div>
        )}

        {showPermanentOption && !isMessageSender && (
          <div className="pt-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              This message will be deleted from your view only.
            </div>
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="cursor-pointer"
            onClick={() => onConfirm(isPermanent)}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
