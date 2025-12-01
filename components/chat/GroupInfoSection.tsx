// components/chat/GroupInfoSection.tsx
"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Shield, UserX, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface GroupInfoSectionProps {
  name: string;
  members: ConversationMember[];
  onRemoveMember: (memberId: string) => void;
}

export function GroupInfoSection({ name, members, onRemoveMember }: GroupInfoSectionProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

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
          {sortedMembers.map((member, index) => (
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
                onClick={() => member.role !== 'admin' && handleMemberClick(member.id)}
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
                        {member.user.first_name} {member.user.last_name}
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

                {selectedMember === member.id && member.role !== 'admin' && (
                  <div className="w-full grid grid-cols-2 gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-gray-300 dark:border-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMember(member.user.id);
                      }}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-gray-300 dark:border-gray-600"
                      asChild
                    >
                      <Link 
                        href={`/contact/${member.user.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}