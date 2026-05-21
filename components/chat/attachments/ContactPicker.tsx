// components/chat/attachments/ContactPicker.tsx
"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useContactsList } from "@/hooks/useContacts";

export function ContactPicker({ 
  open, 
  onClose,
  userId,
  onSelect 
}: { 
  open: boolean;
  onClose: () => void;
  userId: string;
  onSelect: (contact: any) => void;
}) {
  const [search, setSearch] = useState("");

  const { contacts, fetchContactsList } = useContactsList(userId, {
    page: 1,
    is_favorite: false,
  });

  useEffect(() => {
    if (open && userId) {
      fetchContactsList();
    }
  }, [open, userId, fetchContactsList]);

  const filteredContacts = contacts.filter((c: any) => {
    const target = c.target || {};
    const fullName = `${target.first_name || ""} ${target.last_name || ""}`.trim() || c.name || "";
    const email = target.email || c.email || "";
    const phone = target.phone || c.phone || "";
    
    return (
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      phone.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 dark:bg-gray-850 dark:border-gray-800">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Select Contact
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 border-gray-200 focus:bg-white rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Contact List */}
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((c: any) => {
                const target = c.target || {};
                const fullName = `${target.first_name || ""} ${target.last_name || ""}`.trim() || c.name || "Unknown Contact";
                const email = target.email || c.email || "-";
                const avatarUrl = target.avatar_url || c.avatar_url || "";

                return (
                  <div
                    key={c.id}
                    className="flex items-center p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors duration-150"
                    onClick={() => {
                      onSelect(c);
                      onClose();
                      setSearch("");
                    }}
                  >
                    <Avatar
                      src={avatarUrl}
                      name={fullName}
                      size="sm"
                      className="mr-3 h-10 w-10 text-sm shadow-sm border border-gray-100 dark:border-gray-800"
                    />
                    <div className="flex-1 min-w-0 pl-2">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {fullName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {email}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No contacts found
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}