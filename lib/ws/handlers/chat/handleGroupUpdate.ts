import type { WsHandlerContext } from "../../types";

export function handleGroupUpdate(
  msg: Message,
  messageType: string,
  _ctx: WsHandlerContext,
): boolean {
  if (messageType !== "group_update") return false;

  try {
    const updateData = JSON.parse(msg.content);
    console.log("👥 GROUP UPDATE EVENT:", updateData);

    if (updateData.action === "add_member") {
      // Logic to refresh members list
    }
  } catch (e) {
    console.error("Failed to parse group_update event", e);
  }

  return true;
}
