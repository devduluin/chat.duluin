import { toast } from "sonner";
import type { WsHandlerContext } from "../../../types";
import { refreshMembersFromApi, markUserNotMemberInStores } from "./conversationFetch";
import {
  parseMembershipPayload,
  publishMembershipUpdate,
  skipDuplicateMembershipEvent,
} from "./membershipUtils";

export function handleMemberExit(msg: Message, ctx: WsHandlerContext): boolean {
  if (!msg.content?.startsWith("member_exit:")) return false;

  const payload = parseMembershipPayload(msg.content);
  if (!payload) return false;

  const { userId: exitedUserId, userName: exitedUserName, groupName } = payload;
  const dedupeKey = `exit_${msg.conversation_id}_${exitedUserId}`;

  if (skipDuplicateMembershipEvent(ctx, dedupeKey, "member_exit")) {
    return true;
  }

  console.log("👥🚪 MEMBER EXIT EVENT DETECTED!", {
    dedupeKey,
    messageId: msg.id,
    exitedUserId,
    currentUserId: ctx.userId,
    exitedUserName,
    groupName,
    conversationId: msg.conversation_id,
    isCurrentUser: exitedUserId === ctx.userId,
  });

  if (exitedUserId === ctx.userId) {
    markUserNotMemberInStores(msg.conversation_id, ctx.userId);

    toast.success("Left group", {
      description: `You left ${groupName}. You can still view the chat history.`,
    });

    ctx.addOrUpdateMessage(msg.conversation_id, {
      ...msg,
      content: "You left the group",
      message_type: "system",
      is_system_message: true,
      status: "sent" as const,
    });

    ctx.setLastMessage(msg.conversation_id, {
      ...msg,
      content: "You left the group",
    });
  } else {
    refreshMembersFromApi(msg.conversation_id, ctx.userId);
    publishMembershipUpdate(
      ctx,
      msg,
      `${exitedUserName} left the group`,
    );
  }

  return true;
}
