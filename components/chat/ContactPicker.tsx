// components/chat/attachments/ContactPicker.tsx
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// import { getContacts } from "@/services/v1/contactService";
import { useContactsList } from "@/hooks/useContacts"

interface ContactPickerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  selectedContacts?: ContactData[];
  onSelect: (contacts: ContactData[]) => void;
}

export function ContactPicker({
  open,
  onClose,
  userId,
  selectedContacts = [],
  onSelect,
}: ContactPickerProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactData[]>(selectedContacts);
  // const [contacts, setContacts] = useState<ContactData[]>([]);

  // get all contact using service useContactsList hook
  const { contacts, fetchContactsList } = useContactsList(userId, { page: 1, is_favorite: false });
  useEffect(() => {
    fetchContactsList();
  }, [fetchContactsList]);

  const filteredContacts = contacts.filter((contact) => {
    const fullName = contact.target.first_name + " " + contact.target.last_name;
    return (
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      contact.target.email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const toggleContact = (contact: ContactData) => {
    setSelected((prev) =>
      prev.some((c) => c.id === contact.id)
        ? prev.filter((c) => c.id !== contact.id)
        : [...prev, contact]
    );
  };

  const handleSubmit = () => {
    onSelect(selected);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Group Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search contacts..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((contact) => (
                <Badge
                  key={contact.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {contact.target.first_name} {contact.target.last_name}
                  <button
                    onClick={() => toggleContact(contact)}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer ${
                  selected.some((c) => c.id === contact.id)
                    ? "bg-gray-100 dark:bg-gray-800"
                    : ""
                }`}
                onClick={() => toggleContact(contact)}
              >
                <Avatar
                  src={contact.target.avatar_url || ''}
                  name={contact.target.first_name + " " + contact.target.last_name}
                  size="sm"
                  className="mr-3"
                />
                <div className="pl-2">
                  <p className="font-medium">{contact.target.first_name} {contact.target.last_name}</p>
                  <p className="text-sm text-gray-500">{contact.target.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add Members</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}