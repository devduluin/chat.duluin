export const AI_BOT_USER_ID = "1196e18b-c1dc-41aa-946a-0c55e9d64fe6";

export function isAIAssistantConversation(conversationData: {
  display_name?: string;
  Conversation?: { name?: string };
  other_user_id?: string;
}): boolean {
  return (
    conversationData.display_name === "AI Assistant" ||
    conversationData.Conversation?.name === "AI Assistant" ||
    conversationData.other_user_id === AI_BOT_USER_ID
  );
}
