// app/contact/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { Phone, Mail, ChevronLeft, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getContact } from "@/services/v1/contactService";
import { createConversation } from "@/services/conversationService";
import Cookies from "js-cookie";
import { toast } from "sonner";

export default function ContactPage() {
  const params = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const contactData = await getContact(params.id as string);
        if (contactData && contactData.data) {
          setContact(contactData.data);
        } else if (contactData) {
          setContact(contactData);
        }
      } catch (err) {
        console.error("Failed to load contact info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [params.id]);

  const handleStartCall = async () => {
    const userId = Cookies.get("user_id") || "";
    const tenantId = Cookies.get("tenant_id") || "";
    
    if (!userId) {
      toast.error("Please login to make a call");
      return;
    }
    
    if (!contact) return;
    
    // Resolve target contact ID (either from target nested object or direct fields)
    const targetContactId = contact.target?.id || contact.target_id || contact.id;

    try {
      toast.info("Initiating voice call...");
      const response = await createConversation({
        name: "",
        user_id: userId,
        tenant_id: tenantId || userId,
        is_group: false,
        member_ids: [targetContactId]
      });
      
      if (response && response.data) {
        router.push(`/conversation/${response.data.id}?start_call=true`);
      } else {
        toast.error("Failed to initiate voice call");
      }
    } catch (err) {
      console.error("Failed to start voice call:", err);
      toast.error("Failed to initiate voice call");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-gray-500">Contact not found</p>
        <Link href="/">
          <Button variant="default">Back to home</Button>
        </Link>
      </div>
    );
  }

  // Safe computed fields supporting both wrapper schemas
  const contactName = contact.name || (contact.target ? `${contact.target.first_name || ""} ${contact.target.last_name || ""}`.trim() : "") || "Unknown Contact";
  const contactEmail = contact.email || contact.target?.email || "-";
  const contactPhone = contact.phone || contact.target?.phone || "-";
  const contactAvatar = contact.avatar_url || contact.target?.avatar_url || "";
  const contactOnline = contact.is_online || contact.target?.is_online || false;
  const contactStatus = contact.status || contact.target?.status || (contactOnline ? "Available" : "Offline");

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-gray-850">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Contact Info</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-gray-850">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dark:bg-gray-800">
            <DropdownMenuItem className="cursor-pointer dark:hover:bg-gray-700">Edit Contact</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer dark:hover:bg-gray-700">Share Contact</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer dark:hover:bg-gray-700 text-red-600 dark:text-red-400">Delete Contact</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contact Info Scrollable Content */}
      <div className="p-6 flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center space-y-6 bg-white dark:bg-gray-850 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50">
          
          {/* Avatar and status banner */}
          <div className="relative">
            <Avatar
              src={contactAvatar}
              name={contactName}
              size="lg"
              isOnline={contactOnline}
              className="h-28 w-28 text-3xl shadow-md border-2 border-white dark:border-gray-800"
            />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{contactName}</h2>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className={`h-2.5 w-2.5 rounded-full ${contactOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></span>
              <span>{contactStatus}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-2">
            <Button 
              onClick={handleStartCall}
              variant="outline" 
              size="icon" 
              className="h-12 w-12 rounded-full border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200"
              title="Voice Call"
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-12 w-12 rounded-full border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Send Email"
              onClick={() => {
                if (contactEmail !== "-") {
                  window.location.href = `mailto:${contactEmail}`;
                }
              }}
            >
              <Mail className="h-5 w-5" />
            </Button>
          </div>

          {/* Contact Details */}
          <div className="w-full pt-4 space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Contact Information</h3>
              <div className="grid grid-cols-1 gap-4">
                
                {/* Email Section */}
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100/55 dark:border-gray-800/30">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="font-semibold text-gray-850 dark:text-gray-200 truncate">{contactEmail}</p>
                  </div>
                </div>

                {/* Phone Section */}
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100/55 dark:border-gray-800/30">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-xl">
                    <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="font-semibold text-gray-850 dark:text-gray-200 truncate">{contactPhone}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Work Info Section */}
            {(contact.department || contact.position || contact.target?.department || contact.target?.position) && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Work Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100/55 dark:border-gray-800/30">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Department</p>
                    <p className="font-semibold text-gray-850 dark:text-gray-200 truncate">
                      {contact.department || contact.target?.department || "-"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100/55 dark:border-gray-800/30">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Position</p>
                    <p className="font-semibold text-gray-850 dark:text-gray-200 truncate">
                      {contact.position || contact.target?.position || "-"}
                    </p>
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
