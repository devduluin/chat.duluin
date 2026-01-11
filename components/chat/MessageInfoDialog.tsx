// components/chat/MessageInfoDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { CheckCheck, Clock, Eye } from "lucide-react";
import { formatRelativeTime } from "@/utils/formatDate";

interface MessageInfoDialogProps {
  open: boolean;
  onClose: () => void;
  message: Message;
}

export function MessageInfoDialog({
  open,
  onClose,
  message,
}: MessageInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Message Info</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sender Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Sender
            </h3>
            <div className="flex items-center space-x-3">
              <Avatar
                src={message.sender?.avatar_url || ""}
                name={`${message.sender?.first_name} ${message.sender?.last_name}`}
                size="sm"
              />
              <div>
                <p className="font-medium">
                  {message.sender?.first_name} {message.sender?.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {message.sender?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Message Details */}
          <div className="space-y-3 pt-3 border-t dark:border-gray-700">
            {/* Sent Time */}
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium">Sent</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {message.created_at
                    ? new Date(message.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Unknown"}
                </p>
              </div>
            </div>

            {/* Read Status */}
            <div className="flex items-center space-x-3">
              {message.read_at ? (
                <>
                  <CheckCheck className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Read</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(message.read_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Delivered</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Not read yet
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Message Type */}
            <div className="flex items-center space-x-3">
              <div className="h-4 w-4 flex items-center justify-center">
                <span className="text-xs">📝</span>
              </div>
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {message.message_type || "text"}
                </p>
              </div>
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex items-center space-x-3">
                <div className="h-4 w-4 flex items-center justify-center">
                  <span className="text-xs">📎</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Attachments</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {message.attachments.length} file(s)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className="pt-3 border-t dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Message
            </h3>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-sm break-words whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
