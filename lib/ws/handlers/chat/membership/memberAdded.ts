import { toast } from "sonner";
import { getConversationById } from "@/services/v1/conversationService";
import { useConversationsStore } from "@/store/useConversationsStore";
import type { WsHandlerContext } from "../../../types";
import {
  applyConversationDataAsMember,
  buildSidebarConversation,
  refreshMembersFromApi,
} from "./conversationFetch";
import {
  parseMembershipPayload,
  publishMembershipUpdate,
  skipDuplicateMembershipEvent,
} from "./membershipUtils";

export function handleMemberAdded(msg: Message, ctx: WsHandlerContext): boolean {
  if (!msg.content?.startsWith("member_added:")) return false;

  const payload = parseMembershipPayload(msg.content);
  if (!payload) return false;

  const { userId: addedUserId, userName: addedUserName, groupName } = payload;
  const dedupeKey = `added_${msg.conversation_id}_${addedUserId}`;

  if (skipDuplicateMembershipEvent(ctx, dedupeKey, "member_added")) {
    return true;
  }

  console.log("👥✅ MEMBER ADDED EVENT DETECTED!", {
    dedupeKey,
    addedUserId,
    addedUserName,
    groupName,
    conversationId: msg.conversation_id,
  });

  if (addedUserId === ctx.userId) {
    console.log("🎉 Current user added back to group, updating state...");

    getConversationById(msg.conversation_id, ctx.userId)
      .then((response) => {
        if (!response?.status || !response?.data) return;

        const conversationData = response.data;
        applyConversationDataAsMember(msg.conversation_id, conversationData);

        const conversationsInStore = useConversationsStore
          .getState()
          .conversations.find((c: any) => c.Conversation.id === msg.conversation_id);

        if (conversationsInStore) {
          useConversationsStore.getState().updateConversation(msg.conversation_id, {
            is_user_member: true,
          } as any);
          toast.success("Added back to group", {
            description: `You were added back to ${groupName}`,
          });
        } else {
          ctx.addNewConversation(
            buildSidebarConversation(conversationData, msg, true),
          );
          toast.success("Added to group", {
            description: `You were added to ${groupName}`,
          });
        }
      })
      .catch((error) => {
        console.error("Failed to fetch group conversation:", error);
      });
  } else {
    console.log("👤 Another user added to group, refreshing conversation...");
    refreshMembersFromApi(msg.conversation_id, ctx.userId);
  }

  publishMembershipUpdate(
    ctx,
    msg,
    `${addedUserName} was added to the group`,
  );

  return true;
}
