// app/contacts/page.tsx
"use client"

import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { getContacts } from '@/services/v1/contactService'

interface Contact {
  id: string
  name: string
  avatar_url: string | null
  email: string
  status: string
  is_online: boolean
}

const dummyContacts: Contact[] = [
  {
    id: "1",
    name: "John Doe",
    avatar_url: "https://randomuser.me/api/portraits/men/32.jpg",
    email: "john.doe@example.com",
    status: "Available",
    is_online: true
  },
  {
    id: "2",
    name: "Jane Smith",
    avatar_url: "https://randomuser.me/api/portraits/women/44.jpg",
    email: "jane.smith@example.com",
    status: "In a meeting",
    is_online: true
  },
  {
    id: "3",
    name: "Robert Johnson",
    avatar_url: "https://randomuser.me/api/portraits/men/22.jpg",
    email: "robert.j@example.com",
    status: "Offline",
    is_online: false
  },
  {
    id: "4",
    name: "Emily Davis",
    avatar_url: "https://randomuser.me/api/portraits/women/33.jpg",
    email: "emily.d@example.com",
    status: "Available",
    is_online: true
  }
]

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredContacts = dummyContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-xl font-semibold">Contacts</h1>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No contacts found
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredContacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/contact/${contact.id}`}
                className="block p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar 
                    src={contact.avatar_url || ''} 
                    name={contact.name} 
                    isOnline={contact.is_online}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {contact.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {contact.email}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {contact.status}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}