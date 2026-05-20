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
import { useState, useEffect } from "react";
import { updateConversation } from "@services/v1/conversationService";
import { GroupInfoSection } from "./GroupInfoSection";
import { PersonalContactActions } from "./PersonalContactActions";
import { useChatStore } from "@/store/useChatStore";
import { getContacts } from "@/services/v1/contactService";

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

  const [resolvedContact, setResolvedContact] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const currentUserId = typeof window !== "undefined"
    ? document.cookie
        .split("; ")
        .find((row) => row.startsWith("user_id="))
        ?.split("=")[1] || ""
    : "";

  const otherMember = members?.find((m) => {
    const mId = (m as any).user_id || (m as any).UserID || (m as any).user?.id || (m as any).User?.id;
    return mId && mId !== currentUserId;
  });
  const otherUserId = otherMember
    ? ((otherMember as any).user_id || (otherMember as any).UserID || (otherMember as any).user?.id || (otherMember as any).User?.id)
    : null;

  useEffect(() => {
    if (open && !isGroup && currentUserId && otherUserId) {
      const fetchDetails = async () => {
        setLoadingDetails(true);
        try {
          const res = await getContacts(currentUserId, { page: 1, is_favorite: false });
          if (res && res.data) {
            const found = res.data.find((c: any) => {
              const targetId = c.target?.id || c.target_id || c.TargetID;
              return targetId && targetId === otherUserId;
            });
            if (found) {
              setResolvedContact(found);
              return;
            }
          }
          
          // Fallback if not in contact list
          if (otherMember?.user) {
            setResolvedContact({
              target: otherMember.user,
              email: (otherMember.user as any).email,
              phone: (otherMember.user as any).phone
            });
          }
        } catch (err) {
          console.error("Failed to load contact details in modal:", err);
        } finally {
          setLoadingDetails(false);
        }
      };
      fetchDetails();
    } else {
      setResolvedContact(null);
    }
  }, [open, isGroup, currentUserId, otherUserId]);

  const displayName = isGroup
    ? contact.name
    : (resolvedContact
        ? (resolvedContact.name || (resolvedContact.target ? `${resolvedContact.target.first_name || ""} ${resolvedContact.target.last_name || ""}`.trim() : ""))
        : contact.name) || "Chat";

  const displayEmail = isGroup
    ? null
    : (resolvedContact?.email || resolvedContact?.target?.email || contact.email || "-");

  const displayPhone = isGroup
    ? null
    : (resolvedContact?.phone || resolvedContact?.target?.phone || contact.phone || "-");

  const displayAvatar = isGroup
    ? contact.avatar_url
    : (resolvedContact?.avatar_url || resolvedContact?.target?.avatar_url || contact.avatar_url || "");

  const displayStatus = isGroup
    ? null
    : (resolvedContact?.status || resolvedContact?.target?.status || contact.status || "Offline");

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
        user_id: document.cookie
          .split("; ")
          .find((row) => row.startsWith("user_id="))
          ?.split("=")[1] || "",
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

      const user_id = document.cookie
          .split("; ")
          .find((row) => row.startsWith("user_id="))
          ?.split("=")[1] || "";

      const result = await removeMemberFromConversation(contact.id, memberId, user_id);

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

  const handlePromoteMember = async (memberId: string) => {
    try {
      const { promoteMemberToAdmin } = await import(
        "@/services/v1/conversationService"
      );

      const user_id = document.cookie
          .split("; ")
          .find((row) => row.startsWith("user_id="))
          ?.split("=")[1] || "";

      const result = await promoteMemberToAdmin(contact.id, memberId, user_id);

      if (result?.status) {
        toast.success("Member promoted", {
          description: "Member has been promoted to Admin",
        });

        // Optimistically update membership role in Zustand store instantly
        const chatStore = useChatStore.getState();
        const currentMembers = chatStore.members[contact.id] || [];
        const updatedMembers = currentMembers.map((m) => {
          const mId = (m as any).user_id || (m as any).UserID || (m as any).user?.id || (m as any).User?.id;
          if (mId === memberId) {
            return { ...m, role: "admin" };
          }
          return m;
        });
        chatStore.setMembers(contact.id, updatedMembers);

        // Force increment version to trigger immediate UI re-render
        useChatStore.setState((state) => ({ _version: state._version + 1 }));
      } else {
        const errorMsg = result?.message || "Please try again";
        const errorDetails = result?.errors?.join(", ") || "";
        toast.error("Failed to promote member", {
          description: errorDetails || errorMsg,
        });
      }
    } catch (error: any) {
      console.error("Error promoting member:", error);
      toast.error("Failed to promote member", {
        description: error?.message || "An error occurred",
      });
    }
  };

  const handleDemoteMember = async (memberId: string) => {
    try {
      const { demoteMemberToUser } = await import(
        "@/services/v1/conversationService"
      );

      const user_id = document.cookie
          .split("; ")
          .find((row) => row.startsWith("user_id="))
          ?.split("=")[1] || "";

      const result = await demoteMemberToUser(contact.id, memberId, user_id);

      if (result?.status) {
        toast.success("Member demoted", {
          description: "Member has been demoted to User",
        });

        // Optimistically update membership role in Zustand store instantly
        const chatStore = useChatStore.getState();
        const currentMembers = chatStore.members[contact.id] || [];
        const updatedMembers = currentMembers.map((m) => {
          const mId = (m as any).user_id || (m as any).UserID || (m as any).user?.id || (m as any).User?.id;
          if (mId === memberId) {
            return { ...m, role: "member" };
          }
          return m;
        });
        chatStore.setMembers(contact.id, updatedMembers);

        // Force increment version to trigger immediate UI re-render
        useChatStore.setState((state) => ({ _version: state._version + 1 }));
      } else {
        const errorMsg = result?.message || "Please try again";
        const errorDetails = result?.errors?.join(", ") || "";
        toast.error("Failed to demote member", {
          description: errorDetails || errorMsg,
        });
      }
    } catch (error: any) {
      console.error("Error demoting member:", error);
      toast.error("Failed to demote member", {
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
              src={displayAvatar || ""}
              name={displayName}
              size="lg"
              className="h-24 w-24 border border-gray-100 dark:border-gray-800 shadow-sm"
            />
            <div className="text-center">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="text-xl font-semibold text-center animate-in fade-in zoom-in duration-200"
                    autoFocus
                    onBlur={handleSaveGroupName}
                  />
                  {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{displayName}</h3>
                  {isGroup && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      onClick={handleEditClick}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              {!isGroup && displayStatus && (
                <Badge variant={displayStatus.toLowerCase() === "online" ? "default" : "outline"} className={`mt-2 px-2.5 py-0.5 text-xs font-semibold capitalize tracking-wide rounded-full ${displayStatus.toLowerCase() === "online" ? "bg-green-500 hover:bg-green-600 text-white" : "text-gray-500"}`}>
                  {displayStatus}
                </Badge>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">
              {isGroup ? "Group Details" : "Contact Details"}
            </h4>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {displayPhone && displayPhone !== "-" && (
                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/30">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Phone</span>
                      <span className="text-sm font-semibold text-gray-950 dark:text-gray-50">{displayPhone}</span>
                    </div>
                  </div>
                )}

                {displayEmail && displayEmail !== "-" && (
                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/30">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Email</span>
                      <span className="text-sm font-semibold text-gray-950 dark:text-gray-50">{displayEmail}</span>
                    </div>
                  </div>
                )}

                {contact.location && (
                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/30">
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Location</span>
                      <span className="text-sm font-semibold text-gray-950 dark:text-gray-50">{contact.location}</span>
                    </div>
                  </div>
                )}

                {contact.created_at && (
                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/30">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Created</span>
                      <span className="text-sm font-semibold text-gray-950 dark:text-gray-50">
                        {formatRelativeTime(contact.created_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* About/Bio Section */}
          {contact.bio && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">
                  About
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{contact.bio}</p>
              </div>
            </>
          )}

          {/* Group or Personal specific sections */}
          {isGroup ? (
            <GroupInfoSection
              name={displayName}
              members={members}
              onRemoveMember={handleRemoveMember}
              onPromoteMember={handlePromoteMember}
              onDemoteMember={handleDemoteMember}
              currentUserId={
                typeof window !== "undefined"
                  ? document.cookie
                      .split("; ")
                      .find((row) => row.startsWith("user_id="))
                      ?.split("=")[1] || ""
                  : ""
              }
            />
          ) : (
            <PersonalContactActions name={displayName} onClose={onClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
