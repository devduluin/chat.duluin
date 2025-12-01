// components/chat/NewContact.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"
import { toast } from "sonner"
// import { searchUser } from "@/services/userService"
import { searchContact, createContact } from "@/services/v1/contactService" // Assuming you have a service to create contacts
import { useContactsList } from "@/hooks/useContacts"

interface NewContactProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function NewContact({ open, onOpenChange, userId }: NewContactProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [allowSubmit, setAllowSubmit] = useState(false)
  const { fetchContactsList } = useContactsList(userId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Replace with your actual API call to create a contact
      await createContact({ userId, firstName, lastName, phone, email })
      toast.success("Contact created successfully")
      onOpenChange(false)
      setFirstName("")
      setLastName("")
      setPhone("")
      setEmail("")
      fetchContactsList()
    } catch (error) {
      toast.error("Failed to create contact")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchPhone = async (phone: string) => {
    setPhone(phone)
    if (phone.length >= 10) {
      try {
        const result = await searchContact(phone)
        const user = result?.data || null
        if (user) {
          setFirstName(user.first_name || "")
          setLastName(user.last_name || "")
          setEmail(user.email || "")
          setAllowSubmit(true)
        } else {
          toast.error("User not found")
          setFirstName("")
          setLastName("")
          setEmail("")
          setAllowSubmit(false)
        }
      } catch (error) {
        toast.error("Error searching for user")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => handleSearchPhone(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" 
              disabled={!allowSubmit || isLoading}
             >
              {isLoading ? "Saving..." : "Save Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}