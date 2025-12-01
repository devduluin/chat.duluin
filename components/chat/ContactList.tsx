// components/chat/ContactList.tsx
"use client"
import React, { useEffect, useState } from 'react'
import { Avatar } from '../ui/avatar'
import Link from 'next/link'
import { useContactsList } from "@/hooks/useContacts"



// const dummyContacts: Contact[] = [
//   {
//     id: "1",
//     name: "John Doe",
//     avatar_url: "https://randomuser.me/api/portraits/men/32.jpg",
//     email: "john.doe@example.com",
//     status: "Available",
//     is_online: true
//   },
//   {
//     id: "2",
//     name: "Jane Smith",
//     avatar_url: "https://randomuser.me/api/portraits/women/44.jpg",
//     email: "jane.smith@example.com",
//     status: "In a meeting",
//     is_online: true
//   },
//   {
//     id: "3",
//     name: "Robert Johnson",
//     avatar_url: "https://randomuser.me/api/portraits/men/22.jpg",
//     email: "robert.j@example.com",
//     status: "Offline",
//     is_online: false
//   }
// ]

export function ContactList({ userId }: { userId: string }) {
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
    )
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {contacts.map((contact) => (
        <Link
          key={contact.id}
          href={`/contact/${contact.id}`}
          className="block p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Avatar 
              src={contact.target.avatar_url || ''} 
              name={contact.target.first_name + " " + contact.target.last_name} 
              isOnline={contact.target?.is_online}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {contact.target.first_name} {contact.target.last_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {contact.target.email}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}