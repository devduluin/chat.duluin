import { handleChatWsMessage } from "./handlers/chat";
import { handleCallSignalingWsEvent } from "./handlers/callSignalingWs";
import { handleContactSyncEvent } from "./handlers/contactSync";
import { handlePresenceEvent } from "./handlers/presence";
import { handleReactionEvent } from "./handlers/reactions";
import type { WsHandlerContext, WsResponse } from "./types";

export async function dispatchWsMessage(
  response: WsResponse,
  ctx: WsHandlerContext,
): Promise<void> {
  if (handlePresenceEvent(response)) return;
  if (handleContactSyncEvent(response, ctx)) return;
  if (handleCallSignalingWsEvent(response, ctx)) return;
  if (handleReactionEvent(response)) return;

  console.log("🌍📨 [PARSED] Full response:", {
    status: response.status,
    message: response.message,
    data: response.data,
    hasData: !!response.data,
    dataType: typeof response.data,
  });

  const data = response.data as { content?: string } | undefined;
  if (data?.content?.includes("message_deleted")) {
    console.log("🔥🔥🔥 DELETE CONTENT IN PARSED DATA:", data.content);
  }

  if (response.status === "error") {
    console.error("🌍❌ WebSocket error:", response.errors);
    return;
  }

  await handleChatWsMessage(response, ctx);
}
