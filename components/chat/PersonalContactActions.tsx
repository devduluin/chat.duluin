// components/chat/PersonalContactActions.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ShieldAlert, Flag } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface PersonalContactActionsProps {
  name: string;
  onClose: () => void;
}

export function PersonalContactActions({ name, onClose }: PersonalContactActionsProps) {
  const handleBlock = () => {
    toast("User Blocked", {
      description: `${name} has been blocked`,
    });
    onClose();
  };

  const handleReport = () => {
    toast("User Reported", {
      description: `Report submitted for ${name}`,
    });
    onClose();
  };

  return (
    <>
      <Separator />
      <div className="flex space-x-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleBlock}
        >
          <ShieldAlert className="h-4 w-4 mr-2" />
          Block
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleReport}
        >
          <Flag className="h-4 w-4 mr-2" />
          Report
        </Button>
      </div>
    </>
  );
}