// components/chat/ChatHeader.tsx
"use client";

import { ArrowLeft, MoreVertical, Phone, Video, Users } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import Link from "next/link";
import { useState } from "react";
import { ContactInfoModal } from "./ContactInfoModal";
import { ContactPicker } from "./ContactPicker";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useChatStore } from "@/store/useChatStore";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { toast } from "sonner";

interface ChatHeaderProps {
  conversationId: string;
  userId: string;
}

export function ChatHeader({ conversationId, userId }: ChatHeaderProps) {
  const conversation = useChatStore((state) => state.conversations[conversationId]);
  const members = useChatStore((state) => state.members[conversationId]);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  // const members = conversation?.members;

  const handleArchiveChat = () => {
    toast("Chat archived",{
      description: "This conversation has been archived",
    });
  };

  const handleDeleteChat = () => {
    toast("Chat deleted",{
      description: "This conversation has been deleted"
    });
  };

  const handleAddMembers = (contacts: any[]) => {
    toast("Members added",{
      description: `${contacts.length} members added to the group`,
    });
    setShowAddMembers(false);
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
      {/* If there is a members undefined */}
      {members === undefined &&(
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">New Chat</h1>
        </div>
      )}

      {/* Contact Info Modal */}
      {conversation && (
        <ContactInfoModal
          open={showContactInfo}
          onClose={() => setShowContactInfo(false)}
          contact={{
            id: conversation.id,
            name: conversation.name || "Chat",
            avatar_url: conversation.avatar_url ?? "",
            created_at: conversation.created_at || "",
          }}
          isGroup={conversation.is_group}
          members={members}
          onGroupNameUpdate={(newGroupName) => {
            // Update the conversation name in the store
            useChatStore.getState().updateConversation(conversation.id, { name: newGroupName });
            useConversationsStore.getState().updateConversation(conversation.id, { name: newGroupName });
          }}
        />
      )}

      {/* Add Members Modal */}
      {conversation?.is_group && (
        <ContactPicker
          open={showAddMembers}
          onClose={() => setShowAddMembers(false)}
          userId={userId}
          onSelect={handleAddMembers}
        />
      )}

      <div className="flex items-center space-x-4">
        <Link href="/" className="md:hidden">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        {conversation && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowContactInfo(true)}
              className="flex items-center space-x-3"
            >
              <Avatar
                src={conversation.avatar_url || ""}
                name={conversation.name || "Chat"}
                size="md"
              />
              <div className="text-left">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {conversation.name || "Loading..."}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {conversation.is_group
                    ? `${(members?.length ?? 0)} members`
                    : "Online"}
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon">
          <Phone className="h-5 w-5" />
        </Button>
        {/* <Button variant="ghost" size="icon">
          <Video className="h-5 w-5" />
        </Button> */}

        {conversation?.is_group && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddMembers(true)}
          >
            <Users className="h-5 w-5" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <DropdownMenuItem onClick={handleArchiveChat}>
              Archive Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDeleteChat}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              Delete Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}