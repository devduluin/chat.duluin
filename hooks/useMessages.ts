// hooks/useMessages.ts
import { useEffect, useState } from "react";
import { useChatStore } from "@/store/useChatStore";
import axios from "axios";

// Empty array constant to avoid creating new arrays
const EMPTY_ARRAY: any[] = [];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function useMessages(conversationId: string, userId: string) {
  // Use stable selectors with useMemo to prevent infinite loops
  const messages =
    useChatStore((state) => state.messages[conversationId]) || EMPTY_ARRAY;

  const version = useChatStore((state) => state._version);
  const conversations = useChatStore(
    (state) => state.conversations[conversationId],
  );

  // Get store actions once - these are stable and won't change
  const setMessages = useChatStore.getState().setMessages;
  const setConversation = useChatStore.getState().setConversation;
  const setMembers = useChatStore.getState().setMembers;
  const updateMessageReadStatus =
    useChatStore.getState().updateMessageReadStatus;

  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Only fetch once per conversationId change
    if (hasFetched) return;

    const fetchMessages = async () => {
      // Get user_id from cookies as fallback if userId prop is empty
      const userIdFromCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("user_id="))
        ?.split("=")[1];

      const finalUserId = userId || userIdFromCookie;

      // Don't fetch if no userId available
      if (!finalUserId) {
        console.warn("⚠️ No userId available, skipping fetch");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Get token from cookies
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("app_token="))
          ?.split("=")[1];

        console.log("🔍 Fetching conversation:", {
          conversationId,
          userId: finalUserId,
          hasToken: !!token,
        });

        // Use axios directly to chat backend (not API Gateway)
        const res = await axios.get(
          `${API_URL}/api/v1/conversations/${conversationId}?user_id=${finalUserId}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

        const json = res.data;
        const apiMessages = json?.data?.Messages as Message[];
        const apiConversation = json?.data?.Conversation as Conversation;
        const apiMembers = json?.data?.Members as Member[];
        const displayName = json?.data?.display_name;
        const displayAvatar = json?.data?.display_avatar;
        const isUserMember = json?.data?.is_user_member; // Get is_user_member flag from backend

        console.log("🔍 DEBUG - Conversation data:", {
          conversationId,
          apiConversation,
          displayName,
          displayAvatar,
          isUserMember,
          fullResponse: json?.data,
        });

        if (
          Array.isArray(apiMessages) &&
          apiMessages.every((msg) => typeof msg.id === "string")
        ) {
          setMessages(conversationId, apiMessages);
          // Store conversation with display_name, display_avatar, and is_user_member
          setConversation(conversationId, {
            ...apiConversation,
            display_name: displayName,
            display_avatar: displayAvatar,
            is_user_member: isUserMember, // Store is_user_member flag
          } as any);
          setMembers(conversationId, apiMembers);

          // Update read status for messages not sent by the current user
          apiMessages.forEach((msg) => {
            if (msg.sender_id !== finalUserId && !msg.read_at && msg.id) {
              updateMessageReadStatus(msg.id, conversationId, new Date());
            }
          });
        } else {
          console.warn("Invalid message format:", apiMessages);
          // Don't clear messages - keep cached data
          console.log("📦 Using cached messages from localStorage");
        }
      } catch (e) {
        console.error("Fetch error:", e);
        // Don't clear messages on error - preserve offline data
        console.log(
          "📦 Backend offline - showing cached messages from localStorage",
        );
      } finally {
        setLoading(false);
        setHasFetched(true);
      }
    };

    fetchMessages();
  }, [conversationId, userId]); // Remove store actions from dependencies

  // Reset hasFetched when conversationId changes
  useEffect(() => {
    setHasFetched(false);
  }, [conversationId]);

  return { conversations, messages, loading };
}
