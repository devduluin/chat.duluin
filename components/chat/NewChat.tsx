// components/chat/NewChat.tsx
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, ArrowLeft, ArrowRight } from 'lucide-react'

// Import your ShadCN UI components
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Checkbox } from "@/components/ui/checkbox" // <-- Make sure to install this
import { useContactsList } from '@/hooks/useContacts'
import { Avatar } from '@/components/ui/avatar'
import { v4 as uuidv4 } from "uuid";

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

export function NewChat({userId}: { userId: string }) {
  const [mode, setMode] = useState<'new_chat' | 'new_group'>('new_chat')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const router = useRouter()
  const { contacts, fetchContactsList } = useContactsList(userId, { page: 1, is_favorite: false })
  // Fetch contacts when the component mounts
  useEffect(() => {
    fetchContactsList()
  }, [fetchContactsList])

  // Filter contacts based on the search query
   const filteredContacts = contacts.filter((contact) => {
    const fullName = contact.target.first_name + " " + contact.target.last_name;
    return (
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.target.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Handlers
  const handleStartNewChat = (contactId: string) => {
    //if uuid == 00000000-0000-0000-0000-000000000000 generate a new uuid
    if (contactId === "00000000-0000-0000-0000-000000000000") {
      contactId = uuidv4();
    }
    // This will close the dropdown and navigate
    router.push(`/conversation/${contactId}`)
  }
  
  const handleToggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleCreateGroup = () => {
    console.log('Creating group with contacts:', selectedContacts)
    // Here you would implement your logic to create a new group conversation
    // For example: router.push(`/conversation/new?group=${selectedContacts.join(',')}`)
    // For now, it just logs to the console.
  }

  // Render logic
  if (mode === 'new_group') {
    return (
      <div className="w-74">
        {/* Header for New Group */}
        <div className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMode('new_chat')}>
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
                src={contact.target.avatar_url || ''}
                name={contact.target.first_name + " " + contact.target.last_name}
                size="sm"
                className="mr-3"
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.target.first_name+ " " + contact.target.last_name}</p>
              </div>
              <Checkbox
                checked={selectedContacts.includes(contact.id)}
                onCheckedChange={() => handleToggleContactSelection(contact.id)}
              />
            </label>
          ))}
        </div>
        
        {/* Create Group Button */}
        {selectedContacts.length > 0 && (
          <div className="p-2 mt-2">
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleCreateGroup}>
              Create Group ({selectedContacts.length})
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Default View: New Chat
  return (
    <div className="w-74 p-2">
      {/* New Group Button */}
      <button
        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => {
          setSearchQuery('');
          setMode('new_group')
        }}
      >
        <div className="p-2 rounded-full bg-green-500 mr-3">
          <Users className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">New Group</p>
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
              className="w-full flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleStartNewChat(contact.conversation_id)}
            >
              <Avatar
                src={contact.target.avatar_url || ''}
                name={contact.target.first_name + " " + contact.target.last_name}
                size="sm"
                className="mr-3"
              />
              <div className="text-left pl-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.target.first_name+ " " + contact.target.last_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{contact.target.email}</p>
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
  )
}