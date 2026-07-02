import Cookies from "js-cookie";
import { toast } from "sonner";

export interface GlobalWsConnectionConfig {
  userId: string;
  isMounted: { current: boolean };
  shouldReconnect: { current: boolean };
  reconnectAttempts: { current: number };
  maxReconnectAttempts: number;
  reconnectInterval: number;
  wsRef: { current: WebSocket | null };
  onOpen: () => void;
  onMessage: (event: MessageEvent) => void;
  onReconnect: () => void;
}

export function buildWebSocketUrl(userId: string): string | null {
  const API_URL =
    process.env.NEXT_PUBLIC_WS_GATEWAY_URL ||
    "https://apidev-hrms.duluin.com/api/ws/v1/chat";

  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_WS_GATEWAY_URL is not defined");
  }

  const token = Cookies.get("app_token");
  if (!token) {
    console.error(
      "❌ No app_token found in cookies - cannot establish WebSocket connection",
    );
    console.log("Available cookies:", document.cookie);
    toast.error("Authentication required. Please login.", {
      id: "ws-no-token",
    });
    return null;
  }

  const url = new URL(API_URL);
  const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${url.host}${url.pathname}${url.pathname.endsWith("/") ? "" : "/"}${userId}?token=${encodeURIComponent(token)}`;
}

export function connectGlobalWebSocket(config: GlobalWsConnectionConfig): void {
  const {
    userId,
    isMounted,
    shouldReconnect,
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    wsRef,
    onOpen,
    onMessage,
    onReconnect,
  } = config;

  if (
    wsRef.current &&
    (wsRef.current.readyState === WebSocket.OPEN ||
      wsRef.current.readyState === WebSocket.CONNECTING)
  ) {
    console.log("Global WebSocket already connected or connecting.");
    return;
  }

  if (!isMounted.current || !shouldReconnect.current || !userId?.trim()) {
    console.log("⏸️ Cannot connect WebSocket:", {
      isMounted: isMounted.current,
      shouldReconnect: shouldReconnect.current,
      userId: userId || "empty",
    });
    return;
  }

  try {
    const wsUrl = buildWebSocketUrl(userId);
    if (!wsUrl) return;

    console.log("🔗 WebSocket URL:", wsUrl.replace(/token=[^&]+/, "token=***TOKEN***"));

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🌍✅ Global WebSocket CONNECTED for user:", userId);
      console.log("🌍 WebSocket readyState:", ws.readyState, "(1=OPEN)");
      onOpen();
      reconnectAttempts.current = 0;
    };

    ws.onmessage = onMessage;

    ws.onerror = (event) => {
      if (event && (event as Event).type) {
        console.warn(
          "🌍⚠️ Global WebSocket connection issue:",
          ws.readyState === WebSocket.CONNECTING
            ? "Still connecting..."
            : ws.readyState === WebSocket.CLOSED
              ? "Connection closed"
              : "Unknown error",
        );
      }
    };

    ws.onclose = (event) => {
      console.warn(
        `🌍🔌 Global WebSocket closed: code ${event.code}, reason: ${
          event.reason || "No reason provided"
        }, wasClean: ${event.wasClean}`,
      );
      console.log("🌍 Close event details:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        isMounted: isMounted.current,
        shouldReconnect: shouldReconnect.current,
      });
      wsRef.current = null;

      if (event.code === 1000 || !shouldReconnect.current) {
        return;
      }

      if (isMounted.current && shouldReconnect.current) {
        reconnectAttempts.current += 1;
        if (reconnectAttempts.current <= maxReconnectAttempts) {
          console.log(
            `Reconnecting global WebSocket attempt ${reconnectAttempts.current}/${maxReconnectAttempts}...`,
          );
          setTimeout(onReconnect, reconnectInterval);
        } else {
          console.error("Max global WebSocket reconnection attempts reached");
          shouldReconnect.current = false;
        }
      }
    };
  } catch (error) {
    console.error("Failed to create global WebSocket connection:", error);
    wsRef.current = null;

    if (isMounted.current && shouldReconnect.current) {
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current <= maxReconnectAttempts) {
        setTimeout(onReconnect, reconnectInterval);
      } else {
        shouldReconnect.current = false;
      }
    }
  }
}
