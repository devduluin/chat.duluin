import { toast } from "sonner";
import { useConversationsStore } from "@/store/useConversationsStore";
import type { RecentConversation, WsHandlerContext } from "../../types";

export function handleNewGroup(
  msg: Message,
  messageType: string,
  ctx: WsHandlerContext,
): boolean {
  if (messageType !== "new_group") return false;

  console.log("🆕👥 NEW GROUP EVENT DETECTED!", msg.conversation_id);

  let conversationData: any = null;
  try {
    if (typeof msg.content === "string") {
      conversationData = JSON.parse(msg.content);
      msg.content = "Grup baru";
    } else {
      conversationData = msg.content;
    }
    console.log("📦 Group Data parsed:", conversationData);
  } catch (e) {
    console.error("Failed to parse new_group content:", e);
  }

  const conversationExists = useConversationsStore.getState().conversations.some(
    (item: any) => item.Conversation.id === msg.conversation_id,
  );

  if (!conversationExists && conversationData) {
    const newConversation: RecentConversation = {
      Conversation: {
        id: conversationData.id,
        name: conversationData.name,
        avatar_url: conversationData.avatar_url,
        is_group: conversationData.is_group,
        is_cross_tenant: conversationData.is_cross_tenant,
        created_by: conversationData.created_by,
        created_at: conversationData.created_at,
        updated_at: conversationData.updated_at,
        members: conversationData.members || [],
        messages: [],
        display_name: conversationData.name,
        display_avatar: conversationData.avatar_url,
        unread_count: 0,
        is_user_member: true,
      } as any,
      LastMessage: msg,
    };

    console.log("➕ Adding NEW GROUP to sidebar directly:", newConversation);
    ctx.addNewConversation(newConversation);

    toast.success("New Group Created", {
      description: `You were added to group "${conversationData.name}"`,
    });

    return true;
  }

  if (!conversationExists) {
    console.log("⚠️ Parsing failed or empty data, falling back to fetch logic");
    return false;
  }

  console.log("ℹ️ Group already in sidebar, ignoring new_group event");
  return true;
}
