import { LogOut, User } from "lucide-react";
import { Avatar } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface UserDropdownProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout: () => void;
}

export function UserDropdown({ user, onLogout }: UserDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Avatar src={user.avatar} name={user.name} size="sm" />
        <span className="text-sm font-medium hidden md:block">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-gray-500">{user.email}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onLogout}
          className="flex items-center gap-2 text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
