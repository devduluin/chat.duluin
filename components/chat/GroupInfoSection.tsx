// components/chat/GroupInfoSection.tsx
"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff, UserX, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useContactsStore } from "@/store/useContactStore";

interface GroupInfoSectionProps {
  name: string;
  members: ConversationMember[];
  onRemoveMember: (memberId: string) => void;
  onPromoteMember: (memberId: string) => void;
  onDemoteMember: (memberId: string) => void;
  currentUserId: string;
}

export function GroupInfoSection({
  name,
  members,
  onRemoveMember,
  onPromoteMember,
  onDemoteMember,
  currentUserId,
}: GroupInfoSectionProps) {
  const router = useRouter();
  const { contacts } = useContactsStore();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const handleProfileClick = (e: React.MouseEvent, member: ConversationMember) => {
    e.stopPropagation();
    const isSelf = member.user.id === currentUserId;
    if (isSelf) {
      router.push("/profile");
      return;
    }

    const foundContact = contacts?.find((c) => {
      const targetId = c.target?.id || (c as any).target_id || (c as any).TargetID;
      return targetId && targetId === member.user.id;
    });

    if (foundContact) {
      router.push(`/contact/${foundContact.id}`);
    } else {
      toast.error("Kontak tidak ditemukan di daftar kontak Anda.");
    }
  };

  // Find the current user's role in the conversation
  const currentUserRole = members.find((m) => m.user.id === currentUserId)?.role;
  const isCurrentUserAdmin = currentUserRole === "admin";

  // Sort members with admins first
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return 0;
  });

  // Check if there are both admins and non-admins to show divider
  const hasBothAdminsAndMembers = members.some(m => m.role === 'admin') && 
                                 members.some(m => m.role !== 'admin');

  const handleMemberClick = (memberId: string) => {
    setSelectedMember(selectedMember === memberId ? null : memberId);
  };

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-sm text-gray-500 dark:text-gray-400">
            Members ({members.length})
          </h4>
          <Badge variant="outline" className="flex items-center">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {sortedMembers.map((member, index) => {
            const isSelf = member.user.id === currentUserId;
            const showAdminActions = isCurrentUserAdmin && !isSelf;

            return (
              <div key={member.id}>
                {/* Add divider after last admin if there are both admins and members */}
                {hasBothAdminsAndMembers && 
                 index === sortedMembers.findIndex(m => m.role !== 'admin') - 1 && (
                  <Separator className="my-2" />
                )}
                
                <div 
                  className={cn(
                    "group flex flex-col p-3 rounded-lg transition-all",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    "cursor-pointer border border-transparent",
                    selectedMember === member.id 
                      ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                      : ""
                  )}
                  onClick={() => handleMemberClick(member.id)}
                >
                  <div className="flex items-center">
                    <Avatar
                      src={member.user.avatar_url}
                      name={member.user.first_name || member.user.last_name || "User"}
                      size="sm"
                      className="mr-3"
                    />
                    <div className="flex-1 ml-2 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {member.user.first_name} {member.user.last_name} {isSelf && "(You)"}
                        </p>
                        {member.role && (
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                        )}
                      </div>
                      {member.user.status && (
                        <p className="text-xs text-gray-500 truncate">{member.user.status}</p>
                      )}
                    </div>
                  </div>

                  {selectedMember === member.id && (
                    <div className={cn(
                      "w-full grid gap-2 mt-3",
                      showAdminActions ? "grid-cols-3" : "grid-cols-1"
                    )}>
                      {showAdminActions && (
                        <>
                          {member.role === "admin" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-gray-300 dark:border-gray-600 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDemoteMember(member.user.id);
                              }}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Demote
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-gray-300 dark:border-gray-600 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPromoteMember(member.user.id);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Promote
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-gray-300 dark:border-gray-600 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveMember(member.user.id);
                            }}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-300 dark:border-gray-600"
                        onClick={(e) => handleProfileClick(e, member)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}