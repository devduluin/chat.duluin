// components/chat/ContactInfoModal.tsx
"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Pencil,
  Check,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatRelativeTime } from "@/utils/formatDate";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { updateConversation } from "@services/v1/conversationService";
import { GroupInfoSection } from "./GroupInfoSection";
import { PersonalContactActions } from "./PersonalContactActions";

interface ContactInfoModalProps {
  open: boolean;
  onClose: () => void;
  contact: {
    id: string;
    name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
    bio?: string;
    location?: string;
    created_at?: string;
    status?: string;
  };
  isGroup?: boolean;
  members?: ConversationMember[];
  onGroupNameUpdate?: (newName: string) => void;
}

export function ContactInfoModal({
  open,
  onClose,
  contact,
  isGroup = false,
  members = [],
  onGroupNameUpdate,
}: ContactInfoModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newGroupName, setNewGroupName] = useState(contact.name);
  const [isLoading, setIsLoading] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewGroupName(contact.name);
  };

  const handleSaveGroupName = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }

    if (newGroupName === contact.name) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await updateConversation(contact.id, {
        name: newGroupName,
      });
      if (response?.status) {
        if (onGroupNameUpdate) {
          onGroupNameUpdate(newGroupName);
        }
        toast.success("Group name updated successfully");
        setIsEditing(false);
      } else {
        toast.error(response?.message || "Failed to update group name");
      }
    } catch (error: any) {
      console.error("Error updating group name:", error);
      toast.error(error?.message || "Failed to update group name");
      setNewGroupName(contact.name);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { removeMemberFromConversation } = await import(
        "@/services/v1/conversationService"
      );

      const result = await removeMemberFromConversation(contact.id, memberId);

      if (result?.status) {
        toast.success("Member removed", {
          description: "Member has been removed from the group",
        });

        // Note: Member list will be updated via WebSocket automatically
        // No need to manually refresh here
      } else {
        const errorMsg = result?.message || "Please try again";
        const errorDetails = result?.errors?.join(", ") || "";
        toast.error("Failed to remove member", {
          description: errorDetails || errorMsg,
        });
      }
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member", {
        description: error?.message || "An error occurred",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            {isGroup ? "Group Info" : "Contact Info"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex flex-col items-center space-y-3">
            <Avatar
              src={contact.avatar_url || ""}
              name={contact.name}
              size="lg"
              className="h-24 w-24"
            />
            <div className="text-center">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="text-xl font-semibold text-center"
                    autoFocus
                    onBlur={handleSaveGroupName}
                  />
                  {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{contact.name}</h3>
                  {isGroup && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleEditClick}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              {!isGroup && contact.status && (
                <Badge variant="outline" className="mt-1">
                  {contact.status}
                </Badge>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">
              {isGroup ? "Group Details" : "Contact Details"}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              {contact.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{contact.phone}</span>
                </div>
              )}

              {contact.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{contact.email}</span>
                </div>
              )}

              {contact.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{contact.location}</span>
                </div>
              )}

              {contact.created_at && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Created {formatRelativeTime(contact.created_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* About/Bio Section */}
          {contact.bio && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">
                  About
                </h4>
                <p className="text-sm">{contact.bio}</p>
              </div>
            </>
          )}

          {/* Group or Personal specific sections */}
          {isGroup ? (
            <GroupInfoSection
              name={contact.name}
              members={members}
              onRemoveMember={handleRemoveMember}
            />
          ) : (
            <PersonalContactActions name={contact.name} onClose={onClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
