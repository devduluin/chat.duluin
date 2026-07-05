import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { enableConversationE2EE } from "@/services/v1/e2eeService";
import { ensureDeviceRegistered } from "@/lib/e2ee/device-manager";
import { isAIConversation } from "@/lib/message-archive";
import type { E2EEReadiness, EnableE2EEResponse } from "@/lib/e2ee/types";

export function isDirectMessageEligibleForAutoE2EE(conversationId: string): boolean {
  if (isAIConversation(conversationId)) return false;

  const sidebar = useConversationsStore
    .getState()
    .conversations.find((item) => item.Conversation?.id === conversationId);
  const chatConv = useChatStore.getState().conversations[conversationId] as
    | Conversation
    | undefined;

  const isGroup = Boolean(sidebar?.Conversation?.is_group || chatConv?.is_group);
  return !isGroup;
}

export function syncConversationE2EEState(
  conversationId: string,
  payload?: EnableE2EEResponse,
): void {
  const conversation = payload?.conversation;

  useConversationsStore.getState().updateConversation(conversationId, {
    security_mode: "e2ee",
  } as Partial<Conversation>);

  useChatStore.getState().setConversation(conversationId, {
    ...(useChatStore.getState().conversations[conversationId] || {}),
    ...(conversation || {}),
    security_mode: "e2ee",
  } as Conversation);
}

export async function activateConversationE2EE(
  conversationId: string,
  userId: string,
): Promise<{
  ok: boolean;
  readiness?: E2EEReadiness;
  error?: string;
}> {
  try {
    await ensureDeviceRegistered(userId);
    const response = await enableConversationE2EE(conversationId, userId);

    if (!response?.status) {
      return {
        ok: false,
        error: response?.message || "Gagal mengaktifkan enkripsi obrolan",
      };
    }

    const payload = response.data as EnableE2EEResponse | undefined;
    syncConversationE2EEState(conversationId, payload);

    return {
      ok: true,
      readiness: payload?.e2ee_readiness,
    };
  } catch (error) {
    console.error("Failed to activate conversation E2EE:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengaktifkan enkripsi obrolan",
    };
  }
}
