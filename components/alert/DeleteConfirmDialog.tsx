'use client';

import React from 'react';
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
  onConfirm: (isPermanent: boolean) => void;
  onCancel: () => void;
  onTogglePermanent?: (value: boolean) => void;
};

export function DeleteConfirmDialog({
  open,
  title = "Delete Item",
  description = "Are you sure you want to delete this item?",
  isPermanent = false,
  loading = false,
  showPermanentOption = true,
  onConfirm,
  onCancel,
  onTogglePermanent,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()} // 👈 disables outside click
        onEscapeKeyDown={(e) => e.preventDefault()}   // 👈 disables Escape key
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {showPermanentOption && (
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="permanent-delete"
              checked={isPermanent}
              onChange={(e) => onTogglePermanent?.(e.target.checked)}
              className="cursor-pointer"
            />
            <label htmlFor="permanent-delete" className="text-sm cursor-pointer">
              Permanently delete this item
            </label>
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onCancel} disabled={loading} className='cursor-pointer'>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className='cursor-pointer'
            onClick={() => onConfirm(isPermanent)}
            disabled={loading}
          >
            {isPermanent ? "Permanently Delete" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
