// app/contact/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { Phone, Video, Mail, ChevronLeft, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getContact } from "@/services/v1/contactService";

export default function ContactPage() {
  const params = useParams();
  const [contact, setContact] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchContact = async () => {
      try {
        const contactData = await getContact(params.id as string);
        if (contactData) {
          setContact(contactData);
        }
      } catch (err) {
        // setError('Failed to load contact');
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [params.id]);

  // In a real app, you would fetch this data based on params.id
  // const contact = {
  //   id: params?.id,
  //   name: "John Doe",
  //   avatar_url: "https://randomuser.me/api/portraits/men/32.jpg",
  //   email: "john.doe@example.com",
  //   phone: "+1 (555) 123-4567",
  //   status: "Available",
  //   is_online: true,
  //   department: "Engineering",
  //   position: "Senior Developer"
  // }
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">Loading...</div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Contact Info</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Edit Contact</DropdownMenuItem>
            <DropdownMenuItem>Share Contact</DropdownMenuItem>
            <DropdownMenuItem>Delete Contact</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contact Info */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center space-y-4">
          <Avatar
            src={contact.avatar_url || ""}
            name={contact.name}
            size="lg"
            isOnline={contact.is_online}
          />
          <div className="text-center">
            <h2 className="text-xl font-semibold">{contact.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {contact.status} {!contact.is_online && "• Offline"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button variant="outline" size="icon">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon">
              <Mail className="h-5 w-5" />
            </Button>
          </div>

          {/* Contact Details */}
          <div className="w-full pt-6 space-y-6">
            <div className="space-y-1">
              <h3 className="font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 gap-4 pt-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Email
                    </p>
                    <p className="font-medium">{contact.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-full">
                    <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Phone
                    </p>
                    <p className="font-medium">{contact.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {contact.department && contact.position && (
              <div className="space-y-1">
                <h3 className="font-medium">Work Information</h3>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Department
                    </p>
                    <p className="font-medium">{contact.department}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Position
                    </p>
                    <p className="font-medium">{contact.position}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
