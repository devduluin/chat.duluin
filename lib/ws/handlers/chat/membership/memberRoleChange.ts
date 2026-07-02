import { getConversationById } from "@/services/v1/conversationService";
import { useChatStore } from "@/store/useChatStore";
import type { WsHandlerContext } from "../../../types";
import { bumpChatStoreVersion, getMemberId } from "./conversationFetch";
import { publishMembershipUpdate } from "./membershipUtils";

export function handleMemberRoleChange(
  msg: Message,
  ctx: WsHandlerContext,
): boolean {
  const isPromoted = msg.content?.startsWith("member_promoted:");
  const isDemoted = msg.content?.startsWith("member_demoted:");
  if (!isPromoted && !isDemoted) return false;

  const parts = msg.content.split(":");
  const targetUserId = parts[1];
  const targetUserName = parts[2];
  const newRole = isPromoted ? "admin" : "member";

  console.log(
    `👥🔄 MEMBER ${isPromoted ? "PROMOTED" : "DEMOTED"} EVENT DETECTED!`,
    {
      conversationId: msg.conversation_id,
      targetUserId,
      targetUserName,
      newRole,
    },
  );

  const chatStore = useChatStore.getState();
  const currentMembers = chatStore.members[msg.conversation_id] || [];
  const updatedMembers = currentMembers.map((m) => {
    const memberId = getMemberId(m);
    if (memberId === targetUserId) {
      return { ...m, role: newRole };
    }
    return m;
  });

  chatStore.setMembers(msg.conversation_id, updatedMembers);

  getConversationById(msg.conversation_id, ctx.userId)
    .then((response) => {
      if (!response?.status || !response?.data) return;

      const conversationData = response.data;
      chatStore.setMembers(msg.conversation_id, conversationData.Members || []);
      if (conversationData.Conversation) {
        chatStore.setConversation(msg.conversation_id, {
          ...conversationData.Conversation,
          members: conversationData.Members,
        });
      }
      console.log("✅ Members list updated from API after promote/demote");
    })
    .catch((error) => {
      console.error("Failed to refresh conversation members:", error);
    });

  bumpChatStoreVersion();

  publishMembershipUpdate(
    ctx,
    msg,
    `${targetUserName} was ${isPromoted ? "promoted to Admin" : "demoted to User"}`,
  );

  return true;
}
