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
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { createContact } from "@/services/v1/contactService"
import { findContact } from "@/services/userService"
import { useContactsList } from "@/hooks/useContacts"
import { Loader2 } from "lucide-react"

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
  const [isChecking, setIsChecking] = useState(false)
  const [allowSubmit, setAllowSubmit] = useState(false)
  const [cannotAddOpen, setCannotAddOpen] = useState(false)
  const [showFormFields, setShowFormFields] = useState(false)
  const { fetchContactsList } = useContactsList(userId)

  // Reset all states when dialog is closed
  useEffect(() => {
    if (!open) {
      setFirstName("")
      setLastName("")
      setPhone("")
      setEmail("")
      setUserId("")
      setAllowSubmit(false)
      setShowFormFields(false)
    }
  }, [open])

  // Debounced search logic for phone number
  useEffect(() => {
    const contact = phone.trim()
    if (contact.length < 4) {
      setAllowSubmit(false)
      setShowFormFields(false)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsChecking(true)
      try {
        const res = await findContact(contact)
        const result = res?.result

        if (!result) {
          toast.error("User not found")
          setFirstName("")
          setLastName("")
          setEmail("")
          setUserId("")
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
          setAllowSubmit(false)
          setShowFormFields(false)
          return
        }

        const fullName: string = result.name || ""
        setFirstName(fullName)
        setEmail(result.email || "")
        setUserId(result.user_id)
        setAllowSubmit(true)
        setShowFormFields(true)
      } catch (error) {
        toast.error("Error checking contact")
        setAllowSubmit(false)
        setShowFormFields(false)
      } finally {
        setIsChecking(false)
      }
    }, 600) // 600ms debounce delay

    return () => clearTimeout(delayDebounceFn)
  }, [phone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      await createContact({ userId, firstName, lastName, phone, email, uid })
      toast.success("Contact created successfully")
      onOpenChange(false)
      fetchContactsList()
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Failed to create contact"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
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
              <div className="flex justify-between items-center">
                <Label htmlFor="phone">Phone</Label>
                {isChecking && (
                  <span className="text-xs text-blue-500 flex items-center gap-1 animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking...
                  </span>
                )}
              </div>
              <input type="hidden" id="userId" value={userId} />
              <Input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!allowSubmit || isLoading || isChecking}
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
