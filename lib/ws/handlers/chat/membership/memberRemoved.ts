import { toast } from "sonner";
import type { WsHandlerContext } from "../../../types";
import { markUserNotMemberInStores, refreshMembersFromApi } from "./conversationFetch";
import {
  parseMembershipPayload,
  publishMembershipUpdate,
  skipDuplicateMembershipEvent,
} from "./membershipUtils";

export function handleMemberRemoved(msg: Message, ctx: WsHandlerContext): boolean {
  if (!msg.content?.startsWith("member_removed:")) return false;

  const payload = parseMembershipPayload(msg.content);
  if (!payload) return false;

  const { userId: removedUserId, userName: removedUserName, groupName } = payload;
  const dedupeKey = `removed_${msg.conversation_id}_${removedUserId}`;

  if (skipDuplicateMembershipEvent(ctx, dedupeKey, "member_removed")) {
    return true;
  }

  console.log("👥❌ MEMBER REMOVED EVENT DETECTED!", {
    dedupeKey,
    messageId: msg.id,
    removedUserId,
    currentUserId: ctx.userId,
    removedUserName,
    groupName,
    conversationId: msg.conversation_id,
    isCurrentUser: removedUserId === ctx.userId,
  });

  if (removedUserId === ctx.userId) {
    console.log("🚫 Current user removed from group, marking as not member...");
    markUserNotMemberInStores(msg.conversation_id, ctx.userId);

    toast.error("Removed from group", {
      description: `You were removed from ${groupName}. You can still view the chat history.`,
    });

    ctx.addOrUpdateMessage(msg.conversation_id, {
      ...msg,
      content: "You were removed from the group",
      message_type: "system",
      is_system_message: true,
      status: "sent" as const,
    });
  } else {
    console.log("👤 Another user removed from group, refreshing conversation...");
    refreshMembersFromApi(msg.conversation_id, ctx.userId);
    publishMembershipUpdate(
      ctx,
      msg,
      `${removedUserName} was removed from the group`,
    );
  }

  return true;
}
