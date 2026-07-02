import type { WsHandlerContext } from "../../../types";
import { shouldSkipDedupe } from "../utils";

export interface MembershipPayload {
  userId: string;
  userName: string;
  groupName: string;
}

export function parseMembershipPayload(content: string): MembershipPayload | null {
  const parts = content.split(":");
  if (parts.length < 4) return null;

  return {
    userId: parts[1],
    userName: parts[2],
    groupName: parts[3],
  };
}

export function skipDuplicateMembershipEvent(
  ctx: WsHandlerContext,
  dedupeKey: string,
  label: string,
): boolean {
  if (shouldSkipDedupe(ctx.processedMessageIds, dedupeKey)) {
    console.log(`⏭️ Skipping duplicate ${label} event:`, { dedupeKey });
    return true;
  }
  return false;
}

export function publishMembershipUpdate(
  ctx: WsHandlerContext,
  msg: Message,
  content: string,
  options?: { notify?: boolean },
): void {
  const formattedMsg = {
    ...msg,
    content,
    status: "sent" as const,
  };

  ctx.addOrUpdateMessage(msg.conversation_id, formattedMsg);
  ctx.setLastMessage(msg.conversation_id, formattedMsg);

  if (options?.notify !== false) {
    ctx.triggerNotification(formattedMsg);
  }
}
