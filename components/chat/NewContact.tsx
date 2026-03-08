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
import { createContact } from "@/services/v1/contactService" // Assuming you have a service to create contacts
import { findContact } from "@/services/userService"
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
  const [uid, setUserId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [allowSubmit, setAllowSubmit] = useState(false)
  const [cannotAddOpen, setCannotAddOpen] = useState(false)
  const { fetchContactsList } = useContactsList(userId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Replace with your actual API call to create a contact
      await createContact({ userId, firstName, lastName, phone, email, uid })
      toast.success("Contact created successfully")
      onOpenChange(false)
      setFirstName("")
      setLastName("")
      setPhone("")
      setEmail("")
      setUserId("")
      fetchContactsList()
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Failed to create contact"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const [showFormFields, setShowFormFields] = useState(false)

  const handleSearchContact = async (value: string) => {
    setPhone(value)
    const contact = value.trim()
    if (contact.length < 4) {
      setAllowSubmit(false)
      setShowFormFields(false)
      return
    }
    try {
      const res = await findContact(contact)
      const result = res?.result
      if (!result) {
        toast.error("User not found")
        setFirstName("")
        setLastName("")
        setEmail("")
        setUserId("")
        setPhone("")
        setAllowSubmit(false)
        setShowFormFields(false)
        return
      }
      if (result.is_chat_registered === false) {
        setCannotAddOpen(true)
        setFirstName("")
        setLastName("")
        setEmail("")
        setUserId("")
        setPhone("")
        setAllowSubmit(false)
        setShowFormFields(false)
        return
      }
      const fullName: string = result.name || ""
      setFirstName(fullName)
      setEmail(result.email || "")
      setAllowSubmit(true)
      setUserId(result.user_id)
      setPhone(result.phone)
      setShowFormFields(true)
    } catch (error) {
      toast.error("Error checking contact")
      setAllowSubmit(false)
      setShowFormFields(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <input type="hidden" id="userId" value={userId} />
            <Input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => handleSearchContact(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
          
          {showFormFields && (
            <>
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
                  readOnly
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          )}
          
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
    <Dialog open={cannotAddOpen} onOpenChange={setCannotAddOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tidak dapat menambahkan kontak</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-muted-foreground">
          User belum terdaftar di chat workspace.
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" onClick={() => setCannotAddOpen(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
