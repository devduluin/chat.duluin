// components/chat/EditMessageDialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EditMessageDialogProps {
  open: boolean;
  onClose: () => void;
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
}

export function EditMessageDialog({
  open,
  onClose,
  message,
  onEdit,
}: EditMessageDialogProps) {
  const [editedContent, setEditedContent] = useState(message.content);

  useEffect(() => {
    if (open) {
      setEditedContent(message.content);
    }
  }, [open, message.content]);

  const handleSave = () => {
    if (!editedContent.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    if (editedContent === message.content) {
      toast.info("No changes made");
      onClose();
      return;
    }

    onEdit?.(message.id, editedContent);
    toast.success("Message updated");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Type your message..."
            className="w-full min-h-[100px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Press Enter to add a new line
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
