// components/chat/Sidebar.tsx
"use client";

import { useState } from "react";
import { ConversationList } from "./ConversationList";
import { ContactList } from "@/components/chat/ContactList";
import { SearchBar } from "../ui/searchBar";
import { UserProfile } from "../ui/userProfile";
import { Button } from "../ui/button";
import { MessageSquare, Users, Plus, PenBoxIcon, UserPlus } from "lucide-react";
import { NewChat } from "./NewChat";
import { NewContact } from "./NewContact"; // New component for contact creation

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/store/useAccountStore";
import { useGlobalMessageSocket } from "@/hooks/useGlobalMessageSocket";

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<"chats" | "contacts">("chats");
  const { data: account } = useAccountStore();
  const userId = account?.id || "";
  const [showNewContact, setShowNewContact] = useState(false);

  // Connect to global WebSocket for real-time message notifications
  useGlobalMessageSocket(userId);

  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-gray-800 dark:text-white">
            <div
              className={`p-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-700 text-white mr-2 shadow-sm`}
            >
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">Team Chat</h1>
          </div>

          {/* <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <PenBoxIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-0">
                <NewChat userId={userId} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div> */}
        </div>

        {/* Search Bar */}
        <SearchBar />

        {/* Tab Buttons */}
        <div className="flex mt-4 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-center text-sm font-medium rounded-md",
              activeTab === "chats" &&
                "bg-white dark:bg-gray-700 text-blue-600 dark:text-white"
            )}
            onClick={() => setActiveTab("chats")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chats
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-center text-sm font-medium rounded-md",
              activeTab === "contacts" &&
                "bg-white dark:bg-gray-700 text-blue-600 dark:text-white"
            )}
            onClick={() => setActiveTab("contacts")}
          >
            <Users className="h-4 w-4 mr-2" />
            Contacts
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {activeTab === "chats" ? (
          <ConversationList userId={userId} />
        ) : (
          <ContactList userId={userId} />
        )}
      </div>

      {/* Footer: User Profile */}
      <UserProfile />

      {/* Floating Action Button */}
      <div className="absolute bottom-20 right-4">
        {activeTab === "chats" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="rounded-full w-12 h-12 shadow-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                <PenBoxIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-0">
              <NewChat userId={userId} />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            size="icon"
            className="rounded-full w-12 h-12 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            onClick={() => setShowNewContact(true)}
          >
            <UserPlus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* New Contact Dialog */}
      <NewContact
        open={showNewContact}
        onOpenChange={setShowNewContact}
        userId={userId}
      />
    </div>
  );
}
