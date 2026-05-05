// components/chat/MessageInfoDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { CheckCheck, Clock, Eye, Users } from "lucide-react";
import { formatRelativeTime } from "@/utils/formatDate";
import { useEffect, useState } from "react";
import { getMessageReaders } from "@/services/v1/messageService";

interface MessageReader {
  message_id: string;
  user_id: string;
  read_at: string;
  user: User;
}

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
  const [readers, setReaders] = useState<MessageReader[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && message?.id) {
      const fetchReaders = async () => {
        setLoading(true);
        try {
          const res = await getMessageReaders(message.id);
          if (res?.status && res?.data) {
            setReaders(res.data);
          }
        } catch (error) {
          console.error("Failed to fetch readers:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchReaders();
    } else {
      setReaders([]);
    }
  }, [open, message?.id]);

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
              {message.is_read ? (
                <>
                  <CheckCheck className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Read</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Read by everyone
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Delivered</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Not read by everyone yet
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

          {/* Readers List */}
          <div className="pt-3 border-t dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                Read by {readers.length > 0 ? `(${readers.length})` : ""}
              </h3>
            </div>
            
            {loading ? (
              <p className="text-xs text-gray-500">Loading readers...</p>
            ) : readers.length > 0 ? (
              <div className="h-32 rounded-md border border-gray-100 dark:border-gray-800 overflow-y-auto">
                <div className="p-2 space-y-3">
                  {readers.map((reader) => (
                    <div key={reader.user_id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Avatar
                          src={reader.user?.avatar_url || ""}
                          name={`${reader.user?.first_name} ${reader.user?.last_name}`}
                          size="sm"
                          className="h-6 w-6"
                        />
                        <div>
                          <p className="text-xs font-medium">
                            {reader.user?.first_name} {reader.user?.last_name}
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {reader.read_at
                          ? new Date(reader.read_at).toLocaleString("en-US", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No one has read this message yet.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
