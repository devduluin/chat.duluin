// hooks/useMessages.ts
import { useEffect, useState } from "react";
import { useChatStore } from "@/store/useChatStore";
import { shallow } from "zustand/shallow";
import axios from "axios";

const selectChatMessages = (conversationId: string) => (state: ChatStore) =>
  state.messages[conversationId] || [];

const selectConversation = (conversationId: string) => (state: ChatStore) =>
  state.conversations[conversationId] || [];

export function useMessages(conversationId: string, userId: string) {
  const messages = useChatStore(selectChatMessages(conversationId), shallow);
  const conversations = useChatStore(
    selectConversation(conversationId),
    shallow
  );
  const setMessages = useChatStore((s) => s.setMessages);
  const setConversation = useChatStore((s) => s.setConversation);
  const setMembers = useChatStore((s) => s.setMembers);
  const updateMessageReadStatus = useChatStore(
    (s) => s.updateMessageReadStatus
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          `http://localhost:3000/api/v1/conversations/${conversationId}?user_id=${finalUserId}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        const json = res.data;
        const apiMessages = json?.data?.Messages as Message[];
        const apiConversation = json?.data?.Conversation as Conversation;
        const apiMembers = json?.data?.Members as Member[];
        const displayName = json?.data?.display_name;
        const displayAvatar = json?.data?.display_avatar;

        console.log("🔍 DEBUG - Conversation data:", {
          conversationId,
          apiConversation,
          displayName,
          displayAvatar,
          fullResponse: json?.data,
        });

        if (
          Array.isArray(apiMessages) &&
          apiMessages.every((msg) => typeof msg.id === "string")
        ) {
          setMessages(conversationId, apiMessages);
          // Store conversation with display_name and display_avatar
          setConversation(conversationId, {
            ...apiConversation,
            display_name: displayName,
            display_avatar: displayAvatar,
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
          setMessages(conversationId, []);
        }
      } catch (e) {
        console.error("Fetch error:", e);
        setMessages(conversationId, []);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId, userId, setMessages, updateMessageReadStatus]);

  return { conversations, messages, loading };
}
