import { getConversationById } from "@/services/v1/conversationService";
import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import type { RecentConversation } from "../../../types";

export function bumpChatStoreVersion(): void {
  useChatStore.setState((state) => ({ _version: state._version + 1 }));
}

export function getMemberId(member: any): string | undefined {
  return member.user_id || member.UserID || member.user?.id || member.User?.id;
}

export function buildSidebarConversation(
  conversationData: any,
  msg: Message,
  isUserMember: boolean,
): RecentConversation {
  return {
    Conversation: {
      id: conversationData.Conversation.id,
      name: conversationData.Conversation.name,
      avatar_url: conversationData.Conversation.avatar_url,
      is_group: conversationData.Conversation.is_group,
      is_cross_tenant: conversationData.Conversation.is_cross_tenant,
      created_by: conversationData.Conversation.created_by,
      created_at: conversationData.Conversation.created_at,
      updated_at: conversationData.Conversation.updated_at,
      members: conversationData.Members,
      messages: conversationData.Conversation.messages,
      display_name:
        conversationData.display_name || conversationData.Conversation.name,
      display_avatar:
        conversationData.display_avatar ||
        conversationData.Conversation.avatar_url,
      unread_count: 0,
      is_user_member: isUserMember,
    } as any,
    LastMessage: msg,
  };
}

export function applyConversationDataAsMember(
  conversationId: string,
  conversationData: any,
): void {
  useChatStore.getState().setMembers(conversationId, conversationData.Members || []);
  useChatStore.getState().setConversation(conversationId, {
    ...conversationData.Conversation,
    members: conversationData.Members,
    is_user_member: true,
    display_name: conversationData.display_name,
    display_avatar: conversationData.display_avatar,
  } as any);
  bumpChatStoreVersion();
}

export function refreshMembersFromApi(conversationId: string, userId: string): void {
  getConversationById(conversationId, userId)
    .then((response) => {
      if (!response?.status || !response?.data) return;

      const conversationData = response.data;
      useChatStore
        .getState()
        .setMembers(conversationId, conversationData.Members || []);

      if (conversationData.Conversation) {
        useChatStore.getState().setConversation(conversationId, {
          ...conversationData.Conversation,
          members: conversationData.Members,
        });
      }

      console.log("✅ Members updated for conversation:", conversationId);
    })
    .catch((error) => {
      console.error("Failed to refresh conversation members:", error);
    });
}

export function markUserNotMemberInStores(
  conversationId: string,
  userId: string,
): void {
  const currentConversation = useChatStore.getState().conversations[conversationId];
  if (currentConversation) {
    useChatStore.getState().setConversation(conversationId, {
      ...currentConversation,
      is_user_member: false,
    } as any);
  }

  const currentMembers = useChatStore.getState().members[conversationId] || [];
  const updatedMembers = currentMembers.filter(
    (m: any) => getMemberId(m) !== userId,
  );
  useChatStore.getState().setMembers(conversationId, updatedMembers);

  const conversationInList = useConversationsStore
    .getState()
    .conversations.find((item) => item.Conversation.id === conversationId);

  if (conversationInList) {
    useConversationsStore.getState().updateConversation(conversationId, {
      ...conversationInList.Conversation,
      is_user_member: false,
    } as any);
  }

  bumpChatStoreVersion();
}
