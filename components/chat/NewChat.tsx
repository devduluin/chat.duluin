// components/chat/NewChat.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, ArrowLeft, ArrowRight } from "lucide-react";

// Import your ShadCN UI components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox"; // <-- Make sure to install this
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useContactsList } from "@/hooks/useContacts";
import { Avatar } from "@/components/ui/avatar";
import { v4 as uuidv4 } from "uuid";
import { createConversation } from "@/services/conversationService";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { dummyUser } from "@/lib/dummyChat";
import { useConversationsStore } from "@/store/useConversationsStore";

// Define the shape of a contact
interface Contact {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface NewChatProps {
  contacts: Contact[];
}

export function NewChat({ userId }: { userId: string }) {
  const [mode, setMode] = useState<"new_chat" | "new_group">("new_chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showGroupNameModal, setShowGroupNameModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const router = useRouter();
  const { conversations } = useConversationsStore();
  const { contacts, fetchContactsList } = useContactsList(userId, {
    page: 1,
    is_favorite: false,
  });

  // Fetch contacts when the component mounts
  useEffect(() => {
    fetchContactsList();
  }, [fetchContactsList]);

  // Filter contacts based on the search query
  const filteredContacts = contacts.filter((contact) => {
    const fullName = contact.target.first_name + " " + contact.target.last_name;
    return (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.target.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Handlers
  const handleStartNewChat = async (targetUserId: string) => {
    // Check if a conversation already exists with this specific user
    const existingConversation = conversations.find((conv) => {
      // For direct chats (not groups), check if the conversation has exactly 2 members
      // and one of them is the target user
      if (conv.Conversation.is_group) return false;

      const members = conv.Conversation.members || [];
      if (members.length !== 2) return false;

      // Check if both current user and target user are members
      const hasCurrentUser = members.some((m: any) => m.user_id === userId);
      const hasTargetUser = members.some(
        (m: any) => m.user_id === targetUserId,
      );

      return hasCurrentUser && hasTargetUser;
    });

    // If conversation exists, navigate to it
    if (existingConversation) {
      router.push(`/conversation/${existingConversation.Conversation.id}`);
      return;
    }

    // Create a new conversation
    setIsCreating(true);
    try {
      const tenantId = Cookies.get("tenant_id") || dummyUser.tenant_id;

      // get targetUserId data
      const targetContact = contacts.find(
        (contact) => contact.target.id === targetUserId,
      );

      const response = await createConversation({
        name: targetContact
          ? targetContact.target.first_name +
            " " +
            targetContact.target.last_name
          : "Direct Chat",
        // name: "", // Empty for direct chat (backend will use member names)
        user_id: userId,
        tenant_id: tenantId,
        is_group: false,
        member_ids: [userId, targetUserId], // Current user and target user
      });

      if (response.status && response.data) {
        if (response.message === "Conversation already exists") {
          toast.info("Redirecting to existing conversation");
        } else {
          toast.success("Conversation created");
        }
        router.push(`/conversation/${response.data.id}`);
      } else {
        toast.error("Failed to create conversation");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleContactSelection = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId],
    );
  };

  const handleOpenGroupNameModal = () => {
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact");
      return;
    }
    setShowGroupNameModal(true);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    setIsCreating(true);
    try {
      const tenantId = Cookies.get("tenant_id") || dummyUser.tenant_id;

      const response = await createConversation({
        name: groupName,
        user_id: userId,
        tenant_id: tenantId,
        is_group: true,
        member_ids: [userId, ...selectedContacts], // Current user and selected contacts
      });

      if (response.status && response.data) {
        if (response.message === "Conversation already exists") {
          toast.info("Redirecting to existing group");
        } else {
          toast.success("Group created");
        }
        setShowGroupNameModal(false);
        setGroupName("");
        setSelectedContacts([]);
        router.push(`/conversation/${response.data.id}`);
      } else {
        toast.error("Failed to create group");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  // Render logic
  if (mode === "new_group") {
    return (
      <div className="w-74">
        {/* Header for New Group */}
        <div className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMode("new_chat")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="ml-2">
            <h3 className="font-semibold text-sm">Add Group Participants</h3>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative p-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search contacts..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Contact List with Checkboxes */}
        <div className="max-h-60 overflow-y-auto p-1 relative">
          {filteredContacts.map((contact) => (
            <label
              key={contact.id}
              className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Avatar
                src={contact.target.avatar_url || ""}
                name={
                  contact.target.first_name + " " + contact.target.last_name
                }
                size="sm"
                className="mr-3"
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {contact.target.first_name + " " + contact.target.last_name}
                </p>
              </div>
              <Checkbox
                checked={selectedContacts.includes(contact.target.id)}
                onCheckedChange={() =>
                  handleToggleContactSelection(contact.target.id)
                }
              />
            </label>
          ))}
        </div>

        {/* Create Group Button */}
        {selectedContacts.length > 0 && (
          <div className="p-2 mt-2">
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleOpenGroupNameModal}
              disabled={isCreating}
            >
              {`Next (${selectedContacts.length})`}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Group Name Modal */}
        <Dialog open={showGroupNameModal} onOpenChange={setShowGroupNameModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isCreating) {
                      handleCreateGroup();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="text-sm text-gray-500">
                {selectedContacts.length} participant
                {selectedContacts.length > 1 ? "s" : ""} selected
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowGroupNameModal(false);
                  setGroupName("");
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={isCreating || !groupName.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreating ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Default View: New Chat
  return (
    <div className="w-74 p-2">
      {/* New Group Button */}
      <button
        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => {
          setSearchQuery("");
          setMode("new_group");
        }}
      >
        <div className="p-2 rounded-full bg-green-500 mr-3">
          <Users className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          New Group
        </p>
      </button>

      <DropdownMenuSeparator className="my-2" />

      {/* Search Bar */}
      <div className="relative px-2 mb-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search contacts..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Contact List */}
      <div className="max-h-60 overflow-y-auto">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <button
              key={contact.id}
              className="w-full flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              onClick={() => handleStartNewChat(contact.target.id)}
              disabled={isCreating}
            >
              <Avatar
                src={contact.target.avatar_url || ""}
                name={
                  contact.target.first_name + " " + contact.target.last_name
                }
                size="sm"
                className="mr-3"
              />
              <div className="text-left pl-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {contact.target.first_name + " " + contact.target.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {contact.target.email}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="py-4 text-center text-sm text-gray-500">
            No contacts found
          </div>
        )}
      </div>
    </div>
  );
}
