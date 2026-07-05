import type { WsHandlerContext } from "../../types";

export function handleMessageDelivered(
  msg: Message,
  messageType: string,
  _ctx: WsHandlerContext,
): boolean {
  if (messageType !== "message_delivered") return false;

  try {
    const data = JSON.parse(msg.content);
    console.log("📬 MESSAGE DELIVERED EVENT:", data);
  } catch (e) {
    console.warn("Failed to parse message_delivered event", e);
  }

  return true;
}
