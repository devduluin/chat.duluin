import type { WsHandlerContext, WsResponse } from "../../types";
import { normalizeMessageType } from "./utils";
import { preprocessE2eeMessage } from "./preprocessE2ee";
import { handleNewGroup } from "./handleNewGroup";
import { handleNewConversation } from "./handleNewConversation";
import { handleMessageDeleted } from "./handleMessageDeleted";
import { handleMessageRead } from "./handleMessageRead";
import { handleTyping } from "./handleTyping";
import { handleGroupUpdate } from "./handleGroupUpdate";
import { handleGroupMembership } from "./groupMembership";
import { handleIncomingMessage } from "./handleIncomingMessage";

type SyncChatHandler = (
  msg: Message,
  messageType: string,
  ctx: WsHandlerContext,
) => boolean;

const syncHandlers: SyncChatHandler[] = [
  handleNewGroup,
  handleNewConversation,
  handleMessageDeleted,
  handleMessageRead,
  handleTyping,
  handleGroupUpdate,
  handleGroupMembership,
];

export async function handleChatWsMessage(
  response: WsResponse,
  ctx: WsHandlerContext,
): Promise<void> {
  if (!response.status || !response.data) {
    return;
  }

  let msg = response.data as Message;

  console.log("🌍✅ [MSG] Message details:", {
    messageId: msg.id,
    conversationId: msg.conversation_id,
    content: msg.content,
    messageType: msg.message_type,
    MessageType: (msg as any).MessageType,
    sender: msg.sender?.first_name,
    allKeys: Object.keys(msg),
  });

  const messageType = normalizeMessageType(msg);
  msg = await preprocessE2eeMessage(msg, messageType, ctx.userId);

  for (const handler of syncHandlers) {
    if (handler(msg, messageType, ctx)) {
      return;
    }
  }

  await handleIncomingMessage(msg, messageType, ctx);
}
