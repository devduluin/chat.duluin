import { getConversationById } from "@/services/v1/conversationService";
import { useConversationsStore } from "@/store/useConversationsStore";
import type { RecentConversation, WsHandlerContext } from "../../types";
import { isAIAssistantConversation } from "./constants";

export function handleNewConversation(
  msg: Message,
  messageType: string,
  ctx: WsHandlerContext,
): boolean {
  if (messageType !== "new_conversation") return false;

  const conversationExists = useConversationsStore.getState().conversations.some(
    (item: any) => item.Conversation.id === msg.conversation_id,
  );

  if (conversationExists) {
    return true;
  }

  if (!ctx.fetchingConversations.current.has(msg.conversation_id)) {
    ctx.fetchingConversations.current.add(msg.conversation_id);
    getConversationById(msg.conversation_id, ctx.userId)
      .then((response) => {
        if (response?.status && response?.data) {
          const conversationData = response.data;

          if (isAIAssistantConversation(conversationData)) {
            return;
          }

          const newConversation: RecentConversation = {
            ...conversationData,
            Conversation: {
              id: conversationData.Conversation.id,
              name: conversationData.Conversation.name,
              avatar_url: conversationData.Conversation.avatar_url,
              is_group: conversationData.Conversation.is_group,
              is_cross_tenant: conversationData.Conversation.is_cross_tenant,
              created_by: conversationData.Conversation.created_by,
              created_at: conversationData.Conversation.created_at,
              updated_at: conversationData.Conversation.updated_at,
              members: conversationData.Conversation.members,
              messages: conversationData.Conversation.messages,
              display_name:
                conversationData.display_name || conversationData.Conversation.name,
              display_avatar:
                conversationData.display_avatar ||
                conversationData.Conversation.avatar_url,
              status: conversationData.other_user_status,
              unread_count: 0,
            } as any,
            LastMessage: {
              ...msg,
              content: "Chat baru",
              message_type: "system",
              is_system_message: true,
            } as any,
          };

          ctx.addNewConversation(newConversation);
        }
      })
      .finally(() => {
        ctx.fetchingConversations.current.delete(msg.conversation_id);
      });
  }

  return true;
}
