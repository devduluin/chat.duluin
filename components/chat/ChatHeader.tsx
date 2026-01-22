// components/chat/ChatHeader.tsx
"use client";

import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Users,
  WifiOff,
} from "lucide-react";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import Link from "next/link";
import { useState } from "react";
import { ContactInfoModal } from "./ContactInfoModal";
import { ContactPicker } from "./ContactPicker";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useChatStore } from "@/store/useChatStore";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";

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
  const conversation = useChatStore(
    (state) => state.conversations[conversationId],
  );
  const members = useChatStore((state) => state.members[conversationId]);
  const messages = useChatStore((state) => state.messages[conversationId]);

  // Force reactivity by watching store version
  const storeVersion = useChatStore((state) => state._version);

  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const isOnline = useOfflineQueueStore((state) => state.isOnline);

  // Display name dan avatar dari API backend (sudah di-compute dengan benar di backend)
  // Untuk 1-on-1 chat: display_name = nama user lawan (bukan sender dari message)
  // Untuk group chat: display_name = conversation.name
  const displayName =
    (conversation as any)?.display_name ||
    conversation?.name ||
    (members && members.length > 0
      ? `${members[0].user?.first_name} ${members[0].user?.last_name}`
      : "Chat");
  const displayAvatar =
    (conversation as any)?.display_avatar || conversation?.avatar_url;
  // const members = conversation?.members;

  console.log("🔍 DEBUG ChatHeader:", {
    conversationId,
    conversation,
    displayName,
    displayAvatar,
    members,
    membersCount: members?.length,
    storeVersion,
  });

  const handleArchiveChat = () => {
    toast("Chat archived", {
      description: "This conversation has been archived",
    });
  };

  const handleDeleteChat = () => {
    toast("Chat deleted", {
      description: "This conversation has been deleted",
    });
  };

  const handleAddMembers = async (contacts: any[]) => {
    try {
      // Import addMemberToConversation and Cookies
      const { addMemberToConversation } =
        await import("@/services/v1/conversationService");
      const Cookies = (await import("js-cookie")).default;

      // Extract user IDs from contacts
      const userIds = contacts.map((contact) => contact.target.id);

      // Get tenant_id from cookies
      const tenantId = Cookies.get("tenant_id");
      if (!tenantId) {
        toast.error("Missing tenant information", {
          description: "Please login again",
        });
        return;
      }

      // Call API to add members
      const result = await addMemberToConversation(
        conversationId,
        userIds,
        tenantId,
      );

      if (result?.status) {
        toast.success("Members added", {
          description: `${contacts.length} member(s) added to the group`,
        });

        // Refresh conversation details to get updated members
        const { getConversationById } =
          await import("@/services/v1/conversationService");
        const updatedConversation = await getConversationById(
          conversationId,
          userId,
        );

        if (updatedConversation?.status && updatedConversation?.data) {
          // Update members in store
          useChatStore
            .getState()
            .setMembers(conversationId, updatedConversation.data.Members || []);

          // Update conversation in store
          if (updatedConversation.data.Conversation) {
            useChatStore.getState().setConversation(conversationId, {
              ...updatedConversation.data.Conversation,
              members: updatedConversation.data.Members,
            });
          }
        }
      } else {
        // Show detailed error message
        const errorMsg = result?.message || "Please try again";
        const errorDetails = result?.errors?.join(", ") || "";
        toast.error("Failed to add members", {
          description: errorDetails || errorMsg,
        });
      }
    } catch (error: any) {
      console.error("Error adding members:", error);
      toast.error("Failed to add members", {
        description: error?.message || "An error occurred",
      });
    } finally {
      setShowAddMembers(false);
    }
  };

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700 p-2">
          <div className="flex items-center justify-center space-x-2 text-yellow-800 dark:text-yellow-200">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">
              Offline - messages will be sent when connection restored
            </span>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
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
              useChatStore
                .getState()
                .updateConversation(conversation.id, { name: newGroupName });
              useConversationsStore
                .getState()
                .updateConversation(conversation.id, { name: newGroupName });
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
                  src={displayAvatar || ""}
                  name={displayName}
                  size="md"
                />
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {displayName}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {conversation.is_group
                      ? `${members?.length ?? 0} members`
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
    </>
  );
}
