// components/chat/ContactList.tsx
"use client"
import React, { useEffect } from 'react'
import { Avatar } from '../ui/avatar'
import Link from 'next/link'
import { useContactsList } from "@/hooks/useContacts"

export function ContactList({ userId, searchQuery = "" }: { userId: string; searchQuery?: string }) {
  const { contacts, fetchContactsList } = useContactsList(userId, { page: 1, is_favorite: false });

  useEffect(() => {
    fetchContactsList();
  }, [fetchContactsList]);

  if (!contacts) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Filter contacts locally based on search query
  const filteredContacts = contacts.filter((contact) => {
    const firstName = contact.first_name || contact.target?.first_name || "";
    const lastName = contact.last_name || contact.target?.last_name || "";
    const email = contact.target?.email || "";
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    return fullName.includes(query) || email.toLowerCase().includes(query);
  });

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {filteredContacts.map((contact) => (
        <Link
          key={contact.id}
          href={`/contact/${contact.id}`}
          className="block p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Avatar 
              src={contact.target?.avatar_url || ''} 
              name={(contact.first_name || contact.target?.first_name || "") + " " + (contact.last_name || contact.target?.last_name || "")} 
              status={contact.target?.status}
              isOnline={contact.target?.is_online}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {contact.first_name || contact.target?.first_name} {contact.last_name || contact.target?.last_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {contact.target?.email}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}