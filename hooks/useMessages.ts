// hooks/useMessages.ts
import { useEffect, useState } from "react";
import { useChatStore } from "@/store/useChatStore";
import { shallow } from 'zustand/shallow';

const selectChatMessages = (conversationId: string) => 
  (state: ChatStore) => state.messages[conversationId] || [];

const selectConversation = (conversationId: string) =>
  (state: ChatStore) => state.conversations[conversationId] || [];

export function useMessages(conversationId: string, userId: string) {
  const messages = useChatStore(selectChatMessages(conversationId), shallow);
  const conversations = useChatStore(selectConversation(conversationId), shallow);
  const setMessages = useChatStore((s) => s.setMessages);
  const setConversation = useChatStore((s) => s.setConversation);
  const setMembers = useChatStore((s) => s.setMembers);
  const updateMessageReadStatus = useChatStore((s) => s.updateMessageReadStatus);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:3000/api/v1/conversations/${conversationId}?user_id=${userId}`
        );
        // if (!res.ok) throw new Error("Failed to fetch messages");
        
        const json = await res.json();
        const apiMessages = json?.data?.Messages as Message[];
        const apiConversation = json?.data?.Conversation as Conversation;
        const apiMembers = json?.data?.Members as Member[];

        if (Array.isArray(apiMessages) && apiMessages.every((msg) => typeof msg.id === "string")) {
          setMessages(conversationId, apiMessages);
          setConversation(conversationId, apiConversation);
          setMembers(conversationId, apiMembers);
          
          // Update read status for messages not sent by the current user
          apiMessages.forEach((msg) => {
            if (msg.sender_id !== userId && !msg.read_at && msg.id) {
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