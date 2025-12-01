// components/chat/attachments/ApplicationPicker.tsx
"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const applications = [
  { id: '1', name: 'Form', description: 'Fill out a form' },
  { id: '2', name: 'Leave', description: 'Request for annual leave' },
  { id: '3', name: 'Overtime Request', description: 'Request for overtime work' },
  { id: '4', name: 'Travel Request', description: 'Request for travel' },
  { id: '5', name: 'Advance', description: 'Request for advance' },
  { id: '6', name: 'Expense Claim', description: 'Claim for work expenses' },
];

export function ApplicationPicker({
  open,
  onClose,
  onSelect
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (app: any) => void;
}) {
  const [search, setSearch] = useState('');

  const filteredApps = applications.filter(app =>
    app.name.toLowerCase().includes(search.toLowerCase()) ||
    app.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Select HR Application</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search applications..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                onClick={() => {
                  onSelect(app);
                  onClose();
                }}
              >
                <p className="font-medium">{app.name}</p>
                <p className="text-sm text-gray-500">{app.description}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}