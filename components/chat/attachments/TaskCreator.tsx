"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select"; // Custom component or similar
import { Separator } from "@/components/ui/separator";

interface Member {
  id: string;
  name: string;
}

export function TaskCreator({
  open,
  onClose,
  onCreate,
  members
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (task: any) => void;
  members: Member[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDueDate(new Date());
      setPriority("medium");
      setAssignedTo([]);
    }
  }, [open]);

  const handleCreate = () => {
    onCreate({
      title,
      description,
      dueDate,
      priority,
      assignedTo,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                className="rounded-md border"
              />
            </div>
            <div className="space-y-4">
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign to</Label>
                <MultiSelect
                  options={members.map((m) => ({ label: m.name, value: m.id }))}
                  selected={assignedTo}
                  onChange={setAssignedTo}
                  placeholder="Select team members"
                />
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim()}>
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
