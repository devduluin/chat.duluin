// components/chat/ChatHeader.tsx
"use client";

import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Users,
  WifiOff,
} from "lucide-react";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ContactInfoModal } from "./ContactInfoModal";
import { ContactPicker } from "./ContactPicker";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useChatStore } from "@/store/useChatStore";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";
import { useAccountStore } from "@/store/useAccountStore";
import { useSendMessage } from "@/hooks/useSendMessage";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { toast } from "sonner";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { VoiceCallOverlay } from "./VoiceCallOverlay";
import { useVideoCall } from "@/hooks/useVideoCall";
import { VideoCallOverlay } from "./VideoCallOverlay";
import Cookies from "js-cookie";
import { useCallStore } from "@/store/useCallStore";

interface ChatHeaderProps {
  conversationId: string;
  userId: string;
}

export function ChatHeader({ conversationId, userId }: ChatHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldStartCall = searchParams?.get("start_call") === "true";
  const shouldStartVideoCall = searchParams?.get("start_video_call") === "true";
  const shouldAcceptCall = searchParams?.get("accept_call") === "true";
  const acceptCallType = searchParams?.get("call_type") || "voice";
  const pendingRespond = useCallStore((s) => s.pendingRespond);
  const setPendingRespond = useCallStore((s) => s.setPendingRespond);
  const conversation = useChatStore(
    (state) => state.conversations[conversationId],
  );
  const members = useChatStore((state) => state.members[conversationId]);
  const messages = useChatStore((state) => state.messages[conversationId]);

  const sidebarConv = useConversationsStore((state) => 
    state.conversations.find((c) => c.Conversation.id === conversationId)
  );
  const resolvedStatus = sidebarConv?.Conversation.status || (conversation as any)?.status || "offline";

  // Force reactivity by watching store version
  const storeVersion = useChatStore((state) => state._version);

  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const isOnline = useOfflineQueueStore((state) => state.isOnline);
  const removeConversation = useConversationsStore((state) => state.removeConversation);
  const clearConversationData = useChatStore((state) => state.clearConversationData);

  const accountData = useAccountStore((state) => state.data);
  const currentUserName = accountData?.name || 
    (accountData?.first_name ? `${accountData.first_name} ${accountData.last_name || ""}`.trim() : "") ||
    (Cookies.get("first_name") ? `${Cookies.get("first_name")} ${Cookies.get("last_name") || ""}`.trim() : "") ||
    "Chat User";

  const { sendMessage } = useSendMessage();
  const updateConversation = useConversationsStore((state) => state.updateConversation);
  const isDirectConversation = !(sidebarConv?.Conversation?.is_group || (conversation as any)?.is_group);

  const otherUserId = useMemo(() => {
    if (!isDirectConversation) return undefined;
    const fromSidebar =
      (sidebarConv as any)?.other_user_id ||
      (sidebarConv?.Conversation as any)?.other_user_id;
    if (fromSidebar && fromSidebar !== userId) return fromSidebar;
    if (members?.length) {
      const other = members.find((m: any) => {
        const memberId =
          m.user_id || m.UserID || m.user?.id || m.User?.id;
        return memberId && memberId !== userId;
      });
      return (
        (other as any)?.user_id ||
        (other as any)?.UserID ||
        (other as any)?.user?.id ||
        (other as any)?.User?.id
      );
    }
    return undefined;
  }, [isDirectConversation, sidebarConv, members, userId]);

  const [callMessageId, setCallMessageId] = useState<string | null>(null);

  const handleCallConnected = useCallback((isInitiator?: boolean) => {
    // Hanya inisiator/pemanggil pertama yang diperbolehkan mengirim notifikasi panggilan aktif
    if (isInitiator === false) {
      console.log("ℹ️ Joined as responder. Skipping call notification message.");
      return;
    }

    const tenantId = Cookies.get("tenant_id") || userId;
    sendMessage({
      conversationId,
      content: "📞 Panggilan suara aktif. Buka chat ini dan klik ikon telepon di kanan atas untuk bergabung.",
      senderId: userId,
      tenantId: tenantId,
    })
      .then((res: any) => {
        if (res && res.messageId) {
          setCallMessageId(res.messageId);
        }
      })
      .catch((err) => console.error("Failed to send call notification message:", err));
  }, [conversationId, userId, sendMessage]);

  const handleCallEnded = useCallback(() => {
    // Cari pesan notifikasi panggilan suara aktif dari store untuk mendapatkan ID database aslinya
    const messages = useChatStore.getState().messages[conversationId] || [];
    const callMsg = [...messages].reverse().find(
      (m) => m.content?.startsWith("📞 Panggilan suara aktif")
    );

    // Hanya inisiator/pengirim pesan yang diperbolehkan mengedit pesan ini untuk menghindari 403 Forbidden
    const isSender = callMsg ? callMsg.sender_id === userId : true;

    if (!isSender) {
      console.log("ℹ️ Not the call message sender. Skipping edit to avoid 403 Forbidden.");
      return;
    }

    const targetMessageId = callMsg?.id || callMessageId;

    if (targetMessageId) {
      import("@/services/v1/messageService").then(({ editMessage }) => {
        editMessage(targetMessageId, userId, "📞 Suara panggilan berakhir")
          .then((res) => {
            console.log("Call message updated to ended successfully:", res);
            setCallMessageId(null);
          })
          .catch((err) => console.error("Failed to update call message to ended:", err));
      });
    } else {
      console.warn("⚠️ Could not find call message ID to update for conversation:", conversationId);
    }
  }, [conversationId, userId, callMessageId]);

  const handleVideoCallConnected = useCallback((isInitiator?: boolean) => {
    if (isInitiator === false) {
      console.log("ℹ️ Joined as responder. Skipping video call notification message.");
      return;
    }

    const tenantId = Cookies.get("tenant_id") || userId;
    sendMessage({
      conversationId,
      content: "📹 Panggilan video aktif. Buka chat ini dan klik ikon video di kanan atas untuk bergabung.",
      senderId: userId,
      tenantId: tenantId,
    })
      .then((res: any) => {
        if (res && res.messageId) {
          setCallMessageId(res.messageId);
        }
      })
      .catch((err) => console.error("Failed to send video call notification message:", err));
  }, [conversationId, userId, sendMessage]);

  const handleVideoCallEnded = useCallback(() => {
    const messages = useChatStore.getState().messages[conversationId] || [];
    const callMsg = [...messages].reverse().find(
      (m) => m.content?.startsWith("📹 Panggilan video aktif")
    );

    const isSender = callMsg ? callMsg.sender_id === userId : true;

    if (!isSender) {
      console.log("ℹ️ Not the video call message sender. Skipping edit to avoid 403 Forbidden.");
      return;
    }

    const targetMessageId = callMsg?.id || callMessageId;

    if (targetMessageId) {
      import("@/services/v1/messageService").then(({ editMessage }) => {
        editMessage(targetMessageId, userId, "📹 Video panggilan berakhir")
          .then((res) => {
            console.log("Video call message updated to ended successfully:", res);
            setCallMessageId(null);
          })
          .catch((err) => console.error("Failed to update video call message to ended:", err));
      });
    } else {
      console.warn("⚠️ Could not find video call message ID to update for conversation:", conversationId);
    }
  }, [conversationId, userId, callMessageId]);

  const {
    isCalling,
    isConnecting,
    isMuted,
    participants,
    activeSpeakers,
    startCall,
    leaveCall,
    toggleMute,
  } = useVoiceCall(
    conversationId,
    userId,
    currentUserName,
    otherUserId,
    handleCallConnected,
    handleCallEnded,
  );

  const {
    isCalling: isVideoCalling,
    isConnecting: isVideoConnecting,
    isMuted: isVideoMuted,
    isCameraOn: isVideoCameraOn,
    participants: videoParticipants,
    videoTracks,
    localVideoTrack,
    startCall: startVideoCall,
    leaveCall: leaveVideoCall,
    toggleMute: toggleVideoMute,
    toggleCamera: toggleVideoCamera,
  } = useVideoCall(
    conversationId,
    userId,
    currentUserName,
    otherUserId,
    handleVideoCallConnected,
    handleVideoCallEnded,
  );

  const hasInitiatedAutoVoiceCall = useRef(false);
  const hasInitiatedAutoVideoCall = useRef(false);
  const hasHandledAcceptCall = useRef(false);
  const isAnyCallActive =
    isCalling || isConnecting || isVideoCalling || isVideoConnecting;

  useEffect(() => {
    if (
      shouldStartCall &&
      startCall &&
      !isAnyCallActive &&
      !hasInitiatedAutoVoiceCall.current
    ) {
      console.log("🚀 Automatically initiating voice call from query param!");
      hasInitiatedAutoVoiceCall.current = true;
      startCall();

      router.replace(window.location.pathname, { scroll: false });
    }
  }, [shouldStartCall, startCall, isAnyCallActive, router]);

  useEffect(() => {
    if (
      shouldStartVideoCall &&
      startVideoCall &&
      !isAnyCallActive &&
      !hasInitiatedAutoVideoCall.current
    ) {
      console.log("🚀 Automatically initiating video call from query param!");
      hasInitiatedAutoVideoCall.current = true;
      startVideoCall();

      router.replace(window.location.pathname, { scroll: false });
    }
  }, [shouldStartVideoCall, startVideoCall, isAnyCallActive, router]);

  useEffect(() => {
    if (shouldAcceptCall && !hasHandledAcceptCall.current) {
      hasHandledAcceptCall.current = true;
      const respondOptions = {
        asResponder: true,
        peerId: pendingRespond?.peerId,
        callId: pendingRespond?.callId,
      };
      setPendingRespond(null);
      router.replace(window.location.pathname, { scroll: false });

      if (acceptCallType === "video") {
        startVideoCall(respondOptions);
      } else {
        startCall(respondOptions);
      }
    }
  }, [
    shouldAcceptCall,
    acceptCallType,
    pendingRespond,
    startCall,
    startVideoCall,
    setPendingRespond,
    router,
  ]);

  useEffect(() => {
    if (
      pendingRespond &&
      pendingRespond.callType &&
      !shouldAcceptCall &&
      !hasHandledAcceptCall.current
    ) {
      hasHandledAcceptCall.current = true;
      const options = {
        asResponder: true,
        peerId: pendingRespond.peerId,
        callId: pendingRespond.callId,
      };
      setPendingRespond(null);

      if (pendingRespond.callType === "video") {
        startVideoCall(options);
      } else {
        startCall(options);
      }
    }
  }, [
    pendingRespond,
    shouldAcceptCall,
    startCall,
    startVideoCall,
    setPendingRespond,
  ]);

  // Display name dan avatar dari API backend (sudah di-compute dengan benar di backend)
  // Untuk 1-on-1 chat: display_name = nama user lawan (bukan sender dari message)
  // Untuk group chat: display_name = conversation.name
  const displayName =
    (conversation as any)?.display_name ||
    conversation?.name ||
    (members && members.length > 0
      ? `${members[0].user?.first_name} ${members[0].user?.last_name}`
      : "Chat");
  const displayAvatar =
    (conversation as any)?.display_avatar || conversation?.avatar_url;
  // const members = conversation?.members;

  console.log("🔍 DEBUG ChatHeader:", {
    conversationId,
    conversation,
    displayName,
    displayAvatar,
    members,
    membersCount: members?.length,
    storeVersion,
  });

  const handleArchiveChat = () => {
    toast("Chat archived", {
      description: "This conversation has been archived",
    });
  };

  const handleDeleteChat = async () => {
    const confirmed = window.confirm(
      "Delete chat for you? This will remove it from your list until a new message arrives.",
    );
    if (!confirmed) return;

    if (!isOnline) {
      toast.error("You're offline", {
        description: "Connect to the internet to delete chat.",
      });
      return;
    }

    try {
      const { clearConversationHistory } = await import(
        "@/services/v1/conversationService"
      );
      const result = await clearConversationHistory(conversationId, userId);

      if (result?.status) {
        removeConversation(conversationId);
        clearConversationData(conversationId);
        toast.success("Chat deleted", {
          description:
            "This chat has been removed for you. Other participants can still see it.",
        });
        router.push("/");
        return;
      }

      const errorDetails =
        result?.errors?.join(", ") || result?.message || "Please try again";
      toast.error("Failed to delete chat", { description: errorDetails });
    } catch (error: any) {
      toast.error("Failed to delete chat", {
        description: error?.message || "An error occurred",
      });
    }
  };

  const handleAddMembers = async (contacts: any[]) => {
    try {
      // Import addMemberToConversation and Cookies
      const { addMemberToConversation } =
        await import("@/services/v1/conversationService");
      const Cookies = (await import("js-cookie")).default;

      // Extract user IDs from contacts
      const userIds = contacts.map((contact) => contact.target.id);

      // Get tenant_id from cookies
      const tenantId = Cookies.get("tenant_id");
      if (!tenantId) {
        toast.error("Missing tenant information", {
          description: "Please login again",
        });
        return;
      }

      // Call API to add members
      const result = await addMemberToConversation(
        conversationId,
        userIds,
        tenantId,
      );

      if (result?.status) {
        toast.success("Members added", {
          description: `${contacts.length} member(s) added to the group`,
        });

        // Refresh conversation details to get updated members
        const { getConversationById } =
          await import("@/services/v1/conversationService");
        const updatedConversation = await getConversationById(
          conversationId,
          userId,
        );

        if (updatedConversation?.status && updatedConversation?.data) {
          // Update members in store
          useChatStore
            .getState()
            .setMembers(conversationId, updatedConversation.data.Members || []);

          // Update conversation in store
          if (updatedConversation.data.Conversation) {
            useChatStore.getState().setConversation(conversationId, {
              ...updatedConversation.data.Conversation,
              members: updatedConversation.data.Members,
            });
          }
        }
      } else {
        // Show detailed error message
        const errorMsg = result?.message || "Please try again";
        const errorDetails = result?.errors?.join(", ") || "";
        toast.error("Failed to add members", {
          description: errorDetails || errorMsg,
        });
      }
    } catch (error: any) {
      console.error("Error adding members:", error);
      toast.error("Failed to add members", {
        description: error?.message || "An error occurred",
      });
    } finally {
      setShowAddMembers(false);
    }
  };

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700 p-2">
          <div className="flex items-center justify-center space-x-2 text-yellow-800 dark:text-yellow-200">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">
              Offline - messages will be sent when connection restored
            </span>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        {/* Contact Info Modal */}
        {conversation && (
          <ContactInfoModal
            open={showContactInfo}
            onClose={() => setShowContactInfo(false)}
            contact={{
              id: conversation.id,
              name: conversation.name || "Chat",
              avatar_url: conversation.avatar_url ?? "",
              created_at: conversation.created_at || "",
            }}
            isGroup={conversation.is_group}
            members={members}
            onGroupNameUpdate={(newGroupName) => {
              // Update the conversation name in the store
              useChatStore
                .getState()
                .updateConversation(conversation.id, { name: newGroupName });
              useConversationsStore
                .getState()
                .updateConversation(conversation.id, { name: newGroupName });
            }}
          />
        )}

        {/* Add Members Modal */}
        {conversation?.is_group && (
          <ContactPicker
            open={showAddMembers}
            onClose={() => setShowAddMembers(false)}
            userId={userId}
            onSelect={handleAddMembers}
          />
        )}

        <div className="flex items-center space-x-4">
          <Link href="/" className="md:hidden">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          {conversation && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowContactInfo(true)}
                className="flex items-center space-x-3"
              >
                <Avatar
                  src={displayAvatar || ""}
                  name={displayName}
                  size="md"
                  status={resolvedStatus}
                  isOnline={resolvedStatus === "online"}
                />
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {displayName}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {conversation.is_group
                      ? `${members?.length ?? 0} members`
                      : resolvedStatus}
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            id="header-phone-button"
            variant="ghost"
            size="icon"
            disabled={isAnyCallActive}
            onClick={() => {
              if (isAnyCallActive) return;
              startCall();
            }}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            id="header-video-button"
            variant="ghost"
            size="icon"
            disabled={isAnyCallActive}
            onClick={() => {
              if (isAnyCallActive) return;
              startVideoCall();
            }}
          >
            <Video className="h-5 w-5" />
          </Button>

          {conversation?.is_group && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAddMembers(true)}
            >
              <Users className="h-5 w-5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onClick={handleArchiveChat}>
                Archive Chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteChat}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <VoiceCallOverlay
        isCalling={isCalling}
        isConnecting={isConnecting}
        isMuted={isMuted}
        participants={participants}
        activeSpeakers={activeSpeakers}
        displayName={displayName}
        onHangUp={leaveCall}
        onToggleMute={toggleMute}
      />

      <VideoCallOverlay
        isCalling={isVideoCalling}
        isConnecting={isVideoConnecting}
        isMuted={isVideoMuted}
        isCameraOn={isVideoCameraOn}
        participants={videoParticipants}
        videoTracks={videoTracks}
        localVideoTrack={localVideoTrack}
        displayName={displayName}
        onHangUp={leaveVideoCall}
        onToggleMute={toggleVideoMute}
        onToggleCamera={toggleVideoCamera}
      />
    </>
  );
}
