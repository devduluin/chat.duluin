import { useChatStore } from "@/store/useChatStore";
import type { WsResponse } from "../types";

export function handleReactionEvent(response: WsResponse): boolean {
  if (response.message !== "Message reaction updated") return false;

  const reactionPayload = response.data as {
    conversation_id: string;
    message_id: string;
    user_id: string;
    user_name: string;
    user_avatar: string;
    emoji: string;
    action: string;
  } | null;

  if (reactionPayload) {
    console.log("👁️ MESSAGE REACTION UPDATE EVENT RECEIVED:", reactionPayload);
    useChatStore.getState().updateMessageReaction(
      reactionPayload.conversation_id,
      reactionPayload.message_id,
      {
        userId: reactionPayload.user_id,
        userName: reactionPayload.user_name,
        userAvatar: reactionPayload.user_avatar,
        emoji: reactionPayload.emoji,
        action: reactionPayload.action as "added" | "removed",
      },
    );
  }

  return true;
}
