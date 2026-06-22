// hooks/useGlobalMessageSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useContactsStore } from "@/store/useContactStore";
import { useAccountStore } from "@/store/useAccountStore";
import { toast } from "sonner";
import { getConversationById } from "@/services/v1/conversationService";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { processIncomingE2EEMessage } from "@/lib/e2ee/message-crypto";

// Type definitions for conversation structure
interface RecentConversation {
  Conversation: any;
  LastMessage: Message;
}

/**
 * Global WebSocket hook - SINGLE WebSocket for ALL conversations
 * Handles both sending and receiving messages in real-time
 */
export function useGlobalMessageSocket(userId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectInterval = 5000;
  const isMounted = useRef(false);
  const shouldReconnect = useRef(true);
  const fetchingConversations = useRef<Set<string>>(new Set());
  const processedMessageIds = useRef<Record<string, number>>({}); // Track processed events with timestamps
  const isRingActive = useRef(false);

  const addOrUpdateMessage = useChatStore((s) => s.addOrUpdateMessage);
  const setLastMessage = useConversationsStore((s) => s.setMessage);
  const addNewConversation = useConversationsStore((s) => s.addNewConversation);
  const conversations = useConversationsStore((s) => s.conversations);
  const { setSendMessage, setConnected } = useWebSocketStore();
  const setIsSyncing = useContactsStore((s) => s.setIsSyncing);

  // Play a premium high-fidelity synthesized notification chime (G5 and C6 double-tone)
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(783.99, now); // G5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046.50, now + 0.1); // C6
      gain2.gain.setValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.error("Audio Context failed to play chime:", e);
    }
  }, []);

  // Play a premium dual-tone VoIP telephone ring twice (A4 + 480Hz classic ring)
  const playIncomingCallSound = useCallback(() => {
    if (isRingActive.current) return;
    isRingActive.current = true;
    
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const playRing = (startOffset: number) => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now + startOffset); // A4
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, now + startOffset); // Dissonant pair
        
        gainNode.gain.setValueAtTime(0, now + startOffset);
        gainNode.gain.linearRampToValueAtTime(0.15, now + startOffset + 0.05);
        gainNode.gain.setValueAtTime(0.15, now + startOffset + 1.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + startOffset + 1.5);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc1.start(now + startOffset);
        osc2.start(now + startOffset);
        
        osc1.stop(now + startOffset + 1.5);
        osc2.stop(now + startOffset + 1.5);
      };

      playRing(0);
      playRing(2);
      
      setTimeout(() => {
        isRingActive.current = false;
      }, 4000);
    } catch (e) {
      console.error("Audio Context failed to play ring:", e);
      isRingActive.current = false;
    }
  }, []);

  // Native OS desktop notification window
  const showDesktopNotification = useCallback((title: string, body: string, iconUrl?: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          body,
          icon: iconUrl || "/favicon.ico",
          silent: true
        });
        notification.onclick = () => {
          window.focus();
        };
      } catch (e) {
        console.error("Desktop notification failed:", e);
      }
    }
  }, []);

  // Main notification trigger (in-app toast, synthesized sound, and floating desktop notification)
  const triggerNotification = useCallback((msg: any) => {
    if (!msg || msg.sender_id === userId) return;

    // Check desktop push notification preference
    const accountData = useAccountStore.getState().data;
    const notificationPrefs = accountData?.settings?.notification_prefs;
    const isPushEnabled = notificationPrefs?.push !== false;

    if (!isPushEnabled) {
      return;
    }

    const isSystem = msg.message_type === "system" || msg.is_system_message;
    const content = typeof msg.content === "string" ? msg.content : "";
    const isCall = content.startsWith("📞 Panggilan suara aktif");
    const isCallEnd = content.startsWith("📞 Suara panggilan berakhir") || content.startsWith("📞 Panggilan suara berakhir");

    // 1. Play synthesized sounds
    if (isCall) {
      playIncomingCallSound();
    } else if (!isCallEnd) {
      playNotificationSound();
    }

    // 2. Resolve sender name prioritizing contacts list nickname
    let senderName = "Seseorang";
    if (msg.sender) {
      try {
        const { contacts } = useContactsStore.getState();
        const found = contacts?.find((c) => {
          const targetId = c.target?.id || (c as any).target_id || (c as any).TargetID;
          return targetId && targetId === msg.sender_id;
        });
        if (found) {
          const firstName = (found as any).first_name || (found as any).FirstName || found.target?.first_name || "";
          const lastName = (found as any).last_name || (found as any).LastName || found.target?.last_name || "";
          if (firstName || lastName) {
            senderName = `${firstName} ${lastName}`.trim();
          }
        }
      } catch (err) {}
      if (senderName === "Seseorang") {
        senderName = `${msg.sender.first_name || ""} ${msg.sender.last_name || ""}`.trim() || "Seseorang";
      }
    }

    let notificationTitle = `Pesan Baru`;
    let notificationBody = content;

    if (isCall) {
      notificationTitle = `📞 Panggilan Suara Masuk`;
      notificationBody = `Panggilan suara aktif dari ${senderName}. Klik untuk bergabung!`;
    } else if (isSystem) {
      notificationTitle = `Notifikasi Grup`;
      if (content.startsWith("member_added:")) {
        const parts = content.split(":");
        notificationBody = `${parts[2] || "Seseorang"} bergabung ke grup`;
      } else if (content.startsWith("member_exit:")) {
        const parts = content.split(":");
        notificationBody = `${parts[2] || "Seseorang"} keluar dari grup`;
      } else {
        notificationBody = content;
      }
    } else {
      notificationTitle = `Pesan dari ${senderName}`;
    }

    // 3. Float Native OS Notification (WhatsApp-like popup)
    showDesktopNotification(notificationTitle, notificationBody, msg.sender?.avatar_url);

    // 4. In-App toast message popup with action
    if (isCall) {
      toast.info(notificationTitle, {
        description: notificationBody,
        action: {
          label: "Gabung",
          onClick: () => {
            window.location.href = `/conversation/${msg.conversation_id}?start_call=true`;
          }
        },
        duration: 15000,
        position: "top-center"
      });
    } else {
      toast(notificationTitle, {
        description: notificationBody,
        action: {
          label: "Buka",
          onClick: () => {
            window.location.href = `/conversation/${msg.conversation_id}`;
          }
        },
        duration: 5000
      });
    }
  }, [userId, playIncomingCallSound, playNotificationSound, showDesktopNotification]);

  // Send message function - stable reference, always uses current wsRef
  const sendMessageStable = useCallback(
    (payload: string | object) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn(
          "⚠️ WebSocket not connected. State:",
          wsRef.current?.readyState,
        );
        toast.error("Connection lost. Please wait...", {
          id: "ws-disconnected",
        });
        return false;
      }

      try {
        const messageToSend =
          typeof payload === "string" ? payload : JSON.stringify(payload);
        console.log("📤 Sending message via WebSocket:", messageToSend);
        wsRef.current.send(messageToSend);
        return true;
      } catch (error) {
        console.error("❌ Send error:", error);
        toast.error("Failed to send message", { id: "send-error" });
        return false;
      }
    },
    [], // No dependencies - stable function that uses ref
  );

  // Set sendMessage to store immediately on mount
  useEffect(() => {
    setSendMessage(sendMessageStable);
    return () => {
      setSendMessage(null);
    };
  }, [sendMessageStable, setSendMessage]);

  const connectWebSocket = useCallback(() => {
    console.log("🔍 connectWebSocket called:", {
      userId,
      hasUserId: !!userId && userId.trim() !== "",
      isMounted: isMounted.current,
      shouldReconnect: shouldReconnect.current,
      currentWsState: wsRef.current?.readyState,
    });

    // Prevent duplicate connection attempts
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      console.log("Global WebSocket already connected or connecting.");
      return;
    }

    if (
      !isMounted.current ||
      !shouldReconnect.current ||
      !userId ||
      userId.trim() === ""
    ) {
      console.log("⏸️ Cannot connect WebSocket:", {
        isMounted: isMounted.current,
        shouldReconnect: shouldReconnect.current,
        userId: userId || "empty",
      });
      return;
    }

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_WS_GATEWAY_URL ||
        "https://apidev-hrms.duluin.com/api/ws/v1/chat";
      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_WS_GATEWAY_URL is not defined");
      }

      console.log("🔗 Building WebSocket URL from:", API_URL);

      // Parse the HTTP URL
      const url = new URL(API_URL);

      // Convert protocol: http -> ws, https -> wss
      const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";

      // Get authentication token from cookies
      const token = Cookies.get("app_token");

      if (!token) {
        console.error(
          "❌ No app_token found in cookies - cannot establish WebSocket connection",
        );
        console.log("Available cookies:", document.cookie);
        toast.error("Authentication required. Please login.", {
          id: "ws-no-token",
        });
        return; // Don't attempt WebSocket connection without token
      }

      console.log("✅ Token found, proceeding with WebSocket connection");

      // Construct WebSocket URL: ws://host:port/path/userId?token=xxx
      const wsUrl = `${wsProtocol}//${url.host}${url.pathname}${url.pathname.endsWith("/") ? "" : "/"}${userId}?token=${encodeURIComponent(token)}`;

      console.log("🔗 WebSocket URL:", wsUrl.replace(token, "***TOKEN***")); // Hide token in logs

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🌍✅ Global WebSocket CONNECTED for user:", userId);
        console.log("🌍 WebSocket readyState:", ws.readyState, "(1=OPEN)");
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = async (event) => {
        try {
          console.log("🌍📨 [RAW] WebSocket data:", event.data);
          console.log(
            "🌍📨 [TYPE] Data type:",
            typeof event.data,
            event.data instanceof Blob ? "(Blob)" : "",
          );

          // Handle Blob data (convert to text first)
          let jsonData: string;
          if (event.data instanceof Blob) {
            console.log("🌍📨 [BLOB] Converting Blob to text...");
            jsonData = await event.data.text();
            console.log(
              "🌍📨 [BLOB] Converted text:",
              jsonData.substring(0, 200),
            );
          } else {
            jsonData = event.data;
          }

          // Check RAW data for delete message
          if (
            typeof jsonData === "string" &&
            jsonData.includes("message_deleted")
          ) {
            console.log("🔥🔥🔥 DELETE MESSAGE IN RAW DATA!");
          }

          const response = JSON.parse(jsonData);

          // Handle User Presence Event
          if (response.message === "user_presence") {
            const presence = response.data;
            if (presence && presence.user_id) {
              console.log("🟢 [Presence DEBUG] Presence update received:", presence);
              
              // Debug existing conversations and contacts
              const currentConvs = useConversationsStore.getState().conversations;
              console.log("📋 [Presence DEBUG] Current conversations in store:", 
                currentConvs.map(c => ({ id: c.Conversation.id, name: c.Conversation.name, other_user_id: (c as any).other_user_id, status: c.Conversation.status }))
              );
              
              const currentContacts = useContactsStore.getState().contacts;
              console.log("👥 [Presence DEBUG] Current contacts in store:", 
                currentContacts.map(c => ({ id: c.id, name: (c.first_name || c.target?.first_name), target_id: c.target?.id || c.target_id || c.TargetID, status: c.target?.status }))
              );

              useContactsStore.getState().updateContactStatus(
                presence.user_id,
                presence.status,
                presence.last_seen_at
              );
              useConversationsStore.getState().updateConversationUserStatus(
                presence.user_id,
                presence.status
              );

              // Log after update to verify change
              const updatedConvs = useConversationsStore.getState().conversations;
              console.log("✅ [Presence DEBUG] Updated conversations in store:", 
                updatedConvs.map(c => ({ id: c.Conversation.id, name: c.Conversation.name, other_user_id: (c as any).other_user_id, status: c.Conversation.status }))
              );
            }
            return;
          }

          // Handle Custom Events (Contact Sync)
          if (response.message === "contact_sync_started") {
             console.log("🔄 Contact sync started");
             setIsSyncing(true);
             // toast.info("Syncing contacts from HRIS...", { id: "contact-sync" });
             
             Swal.fire({
               title: 'Syncing Contacts',
               text: 'Please wait while we sync your contacts from HRIS...',
               icon: 'info',
               allowOutsideClick: false,
               allowEscapeKey: false,
               didOpen: () => {
                 Swal.showLoading();
               }
             });
             return;
          }

          if (response.message === "contact_sync_completed") {
             console.log("✅ Contact sync completed");
             setIsSyncing(false);
             // toast.success("Contacts synced successfully", { id: "contact-sync" });
             
             Swal.fire({
               title: 'Sync Completed',
               text: `Contacts have been synced successfully! (${response.data?.count || 0} contacts)`,
               icon: 'success',
               timer: 2000,
               showConfirmButton: false
             });
             
             // Optional: Trigger refetch contacts here if needed
             // useContactsStore.getState().fetchContacts(); 
             return;
          }

          if (response.message === "contact_sync_failed") {
             console.log("❌ Contact sync failed");
             setIsSyncing(false);
             
             Swal.fire({
               title: 'Sync Failed',
               text: response.data?.message || "Failed to sync contacts",
               icon: 'error'
             });
             return;
          }

          // Handle Message Reaction Event
          if (response.message === "Message reaction updated") {
            const reactionPayload = response.data;
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
                  action: reactionPayload.action,
                }
              );
            }
            return;
          }

          console.log("🌍📨 [PARSED] Full response:", {
            status: response.status,
            message: response.message,
            data: response.data,
            hasData: !!response.data,
            dataType: typeof response.data,
          });

          // Check parsed data for delete
          if (response.data?.content?.includes("message_deleted")) {
            console.log(
              "🔥🔥🔥 DELETE CONTENT IN PARSED DATA:",
              response.data.content,
            );
          }

          if (response.status === "error") {
            console.error("🌍❌ WebSocket error:", response.errors);
            return;
          }

          if (response.status && response.data) {
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

            // Normalize message type
            const messageType =
              msg.message_type || (msg as any).MessageType || "";

            if (messageType === "e2ee_text") {
              msg = await processIncomingE2EEMessage(msg, userId);
            }
            
            // --- 0. HANDLE NEW GROUP CREATION ---
            // Explicitly handle "new_group" message type
            if (messageType === "new_group") {
              console.log("🆕👥 NEW GROUP EVENT DETECTED!", msg.conversation_id);
              
              // Parse the content to get conversation details
              let conversationData: any = null;
              try {
                if (typeof msg.content === 'string') {
                  conversationData = JSON.parse(msg.content);
                  // Override content to show "Grup baru" instead of raw JSON in sidebar
                  msg.content = "Grup baru";
                } else {
                  conversationData = msg.content;
                }
                console.log("📦 Group Data parsed:", conversationData);
              } catch (e) {
                console.error("Failed to parse new_group content:", e);
              }

              // Check if conversation already exists in the list
              const conversationExists = useConversationsStore.getState().conversations.some(
                (item: any) => item.Conversation.id === msg.conversation_id
              );

              if (!conversationExists && conversationData) {
                 // Create RecentConversation object directly from payload
                 // This matches the structure expected by addNewConversation
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
                    // Display properties
                    display_name: conversationData.name, 
                    display_avatar: conversationData.avatar_url,
                    unread_count: 0,
                    is_user_member: true
                  } as any,
                  LastMessage: msg
                };

                console.log("➕ Adding NEW GROUP to sidebar directly:", newConversation);
                addNewConversation(newConversation);
                
                // Show notification
                toast.success("New Group Created", {
                  description: `You were added to group "${conversationData.name}"`
                });
                
                return; // Stop processing, we handled it
              } else if (!conversationExists) {
                // Fallback if parsing failed - let the generic "new conversation" logic handle it below
                console.log("⚠️ Parsing failed or empty data, falling back to fetch logic");
              } else {
                console.log("ℹ️ Group already in sidebar, ignoring new_group event");
                return;
              }
            }

            if (messageType === "new_conversation") {
              const conversationExists = useConversationsStore.getState().conversations.some(
                (item: any) => item.Conversation.id === msg.conversation_id
              );

              if (conversationExists) {
                return;
              }

              if (!fetchingConversations.current.has(msg.conversation_id)) {
                fetchingConversations.current.add(msg.conversation_id);
                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;
                      const AI_BOT_USER_ID = "1196e18b-c1dc-41aa-946a-0c55e9d64fe6";
                      const isAIAssistant =
                        conversationData.display_name === "AI Assistant" ||
                        conversationData.Conversation?.name === "AI Assistant" ||
                        conversationData.other_user_id === AI_BOT_USER_ID;

                      if (isAIAssistant) {
                        return;
                      }

                      const newConversation: RecentConversation = {
                        ...conversationData,
                        Conversation: {
                          id: conversationData.Conversation.id,
                          name: conversationData.Conversation.name,
                          avatar_url: conversationData.Conversation.avatar_url,
                          is_group: conversationData.Conversation.is_group,
                          is_cross_tenant:
                            conversationData.Conversation.is_cross_tenant,
                          created_by: conversationData.Conversation.created_by,
                          created_at: conversationData.Conversation.created_at,
                          updated_at: conversationData.Conversation.updated_at,
                          members: conversationData.Conversation.members,
                          messages: conversationData.Conversation.messages,
                          display_name:
                            conversationData.display_name ||
                            conversationData.Conversation.name,
                          display_avatar:
                            conversationData.display_avatar ||
                            conversationData.Conversation.avatar_url,
                          status: conversationData.other_user_status,
                          unread_count: 0,
                        } as any,
                        LastMessage: {
                          ...msg,
                          content: "Chat baru",
                          message_type: "system",
                          is_system_message: true,
                        } as any,
                      };

                      addNewConversation(newConversation);
                    }
                  })
                  .finally(() => {
                    fetchingConversations.current.delete(msg.conversation_id);
                  });
              }

              return;
            }

            // --- 1. HANDLE MESSAGE DELETION ---
            if (messageType === "message_deleted") {
              let deletedMessageId = msg.id;
              let deleteForEveryone = false;

              // Parse JSON content if available (new format)
              try {
                const eventData = JSON.parse(msg.content);
                deletedMessageId = eventData.message_id || msg.id;
                deleteForEveryone = eventData.delete_for_everyone;
              } catch (e) {
                // Fallback for legacy format or if content is not JSON
                if (msg.content?.startsWith("message_deleted:")) {
                  const parts = msg.content.split(":");
                  deletedMessageId = parts[1];
                  deleteForEveryone = parts[2] === "true";
                }
              }

              console.log("🗑️🔥 DELETE EVENT DETECTED!", {
                deletedMessageId,
                conversationId: msg.conversation_id,
                deleteForEveryone,
              });

              useChatStore
                .getState()
                .removeMessage(msg.conversation_id, deletedMessageId);
              return;
            }

            // --- 2. HANDLE READ RECEIPTS ---
            if (messageType === "message_read") {
              try {
                const readData = JSON.parse(msg.content);
                console.log("👁️ MESSAGE READ EVENT:", readData);
                
                const readAt = readData.read_at ? new Date(readData.read_at) : new Date();
                if (readData.user_id && readData.user_id !== userId) {
                  useChatStore.getState().updateMessagesReadUpToMessage(
                    msg.conversation_id,
                    userId,
                    readData.message_id,
                    readAt,
                  );
                } else {
                  useChatStore.getState().updateMessageReadStatus(
                    readData.message_id,
                    msg.conversation_id,
                    readAt,
                  );
                }
              } catch (e) {
                console.error("Failed to parse message_read event", e);
              }
              return;
            }

            // --- 3. HANDLE TYPING INDICATORS (Future Implementation) ---
            if (
              messageType === "typing_started" ||
              messageType === "typing_stopped"
            ) {
              try {
                const typingData = JSON.parse(msg.content);
                console.log(
                  `✍️ TYPING EVENT (${messageType}):`,
                  typingData.user_name,
                );
                
                // Update typing status in store
                // We'll implement this store method next
                if (useChatStore.getState().setTypingStatus) {
                  useChatStore.getState().setTypingStatus(
                    msg.conversation_id, 
                    typingData.user_id, 
                    messageType === 'typing_started',
                    typingData.user_name
                  );
                }
              } catch (e) {
                console.error("Failed to parse typing event", e);
              }
              return;
            }

            // --- 4. HANDLE GROUP UPDATES (Future Implementation) ---
            if (messageType === "group_update") {
              try {
                const updateData = JSON.parse(msg.content);
                console.log("👥 GROUP UPDATE EVENT:", updateData);

                // Example: Handle member add/remove
                if (updateData.action === "add_member") {
                  // Logic to refresh members list
                }
              } catch (e) {
                console.error("Failed to parse group_update event", e);
              }
              return;
            }

            // --- LEGACY SUPPORT & SYSTEM MESSAGES ---
            // Check for old system message format
            const isSystemMessage = messageType === "system";

            // Legacy Delete
            if (
              isSystemMessage &&
              msg.content?.startsWith("message_deleted:")
            ) {
              const parts = msg.content.split(":");
              const deletedMessageId = parts[1];
              useChatStore
                .getState()
                .removeMessage(msg.conversation_id, deletedMessageId);
              return;
            }

            // Handle member added event (Current Implementation)
            const isMemberAddedMessage =
              msg.content?.startsWith("member_added:");
            if (isSystemMessage && isMemberAddedMessage) {
              // Format: "member_added:{userID}:{userName}:{groupName}"
              const parts = msg.content.split(":");
              const addedUserId = parts[1];
              const addedUserName = parts[2];
              const groupName = parts[3];

              // Create unique key for deduplication based on event + conversationId + userId
              const dedupeKey = `added_${msg.conversation_id}_${addedUserId}`;

              // Prevent duplicate processing - check if processed in last 5 seconds
              const now = Date.now();
              const lastProcessed = (processedMessageIds.current as any)[
                dedupeKey
              ];
              if (lastProcessed && now - lastProcessed < 5000) {
                console.log("⏭️ Skipping duplicate member_added event:", {
                  dedupeKey,
                  timeSinceLastProcess: now - lastProcessed,
                });
                return;
              }
              (processedMessageIds.current as any)[dedupeKey] = now;

              console.log("👥✅ MEMBER ADDED EVENT DETECTED!", {
                dedupeKey,
                addedUserId,
                addedUserName,
                groupName,
                conversationId: msg.conversation_id,
              });

              // Check if current user is the one added
              if (addedUserId === userId) {
                // Current user was added to group - update state immediately
                console.log(
                  "🎉 Current user added back to group, updating state...",
                );

                // Fetch latest conversation data to get full member list
                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      // IMPORTANT: Update members in chat store
                      useChatStore
                        .getState()
                        .setMembers(
                          msg.conversation_id,
                          conversationData.Members || [],
                        );
                      console.log(
                        "✅ Updated members list in chat store:",
                        conversationData.Members?.length,
                      );

                      // Update conversation in chat store with is_user_member: true
                      useChatStore
                        .getState()
                        .setConversation(msg.conversation_id, {
                          ...conversationData.Conversation,
                          members: conversationData.Members,
                          is_user_member: true, // User is now an active member again
                          display_name: conversationData.display_name,
                          display_avatar: conversationData.display_avatar,
                        } as any);
                      console.log(
                        "✅ Updated is_user_member to TRUE in chat store",
                      );

                      // Force increment version to trigger re-render
                      useChatStore.setState((state) => ({
                        _version: state._version + 1,
                      }));
                      console.log("✅ Force re-render triggered");

                      // Check if conversation already in sidebar
                      const conversationsInStore = useConversationsStore
                        .getState()
                        .conversations.find(
                          (c: any) => c.Conversation.id === msg.conversation_id,
                        );

                      if (conversationsInStore) {
                        // Update existing conversation
                        useConversationsStore
                          .getState()
                          .updateConversation(msg.conversation_id, {
                            is_user_member: true,
                          } as any);
                        console.log(
                          "✅ Updated is_user_member to TRUE in conversations store",
                        );

                        // Show toast notification
                        toast.success(`Added back to group`, {
                          description: `You were added back to ${groupName}`,
                        });
                      } else {
                        // Create new conversation entry for sidebar
                        const newConversation: RecentConversation = {
                          Conversation: {
                            id: conversationData.Conversation.id,
                            name: conversationData.Conversation.name,
                            avatar_url:
                              conversationData.Conversation.avatar_url,
                            is_group: conversationData.Conversation.is_group,
                            is_cross_tenant:
                              conversationData.Conversation.is_cross_tenant,
                            created_by:
                              conversationData.Conversation.created_by,
                            created_at:
                              conversationData.Conversation.created_at,
                            updated_at:
                              conversationData.Conversation.updated_at,
                            members: conversationData.Members,
                            messages: conversationData.Conversation.messages,
                            display_name:
                              conversationData.display_name ||
                              conversationData.Conversation.name,
                            display_avatar:
                              conversationData.display_avatar ||
                              conversationData.Conversation.avatar_url,
                            unread_count: 0,
                            is_user_member: true, // User is an active member
                          } as any,
                          LastMessage: msg,
                        };

                        // Add to conversation list
                        addNewConversation(newConversation);
                        console.log(
                          "✅ Group conversation added to sidebar:",
                          msg.conversation_id,
                        );

                        // Show toast notification
                        toast.success(`Added to group`, {
                          description: `You were added to ${groupName}`,
                        });
                      }
                    }
                  })
                  .catch((error) => {
                    console.error("Failed to fetch group conversation:", error);
                  });
              } else {
                // Another user was added - just refresh the member list for this conversation
                console.log(
                  "👤 Another user added to group, refreshing conversation...",
                );

                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      // Update members in chat store
                      useChatStore
                        .getState()
                        .setMembers(
                          msg.conversation_id,
                          conversationData.Members || [],
                        );

                      // Update conversation in chat store
                      if (conversationData.Conversation) {
                        useChatStore
                          .getState()
                          .setConversation(msg.conversation_id, {
                            ...conversationData.Conversation,
                            members: conversationData.Members,
                          });
                      }

                      console.log(
                        "✅ Members updated for conversation:",
                        msg.conversation_id,
                      );
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "Failed to refresh conversation members:",
                      error,
                    );
                  });
              }

              // Add system message to chat
              const formattedMsg = {
                ...msg,
                content: `${addedUserName} was added to the group`,
                status: "sent" as const,
              };
              addOrUpdateMessage(msg.conversation_id, formattedMsg);

              // Update last message in sidebar
              setLastMessage(msg.conversation_id, formattedMsg);

              triggerNotification(formattedMsg);

              // Don't process further for member added events
              return;
            }

            const isMemberExitMessage = msg.content?.startsWith("member_exit:");
            if (isSystemMessage && isMemberExitMessage) {
              const parts = msg.content.split(":");
              const exitedUserId = parts[1];
              const exitedUserName = parts[2];
              const groupName = parts[3];

              const dedupeKey = `exit_${msg.conversation_id}_${exitedUserId}`;

              const now = Date.now();
              const lastProcessed = (processedMessageIds.current as any)[
                dedupeKey
              ];
              if (lastProcessed && now - lastProcessed < 5000) {
                console.log("⏭️ Skipping duplicate member_exit event:", {
                  dedupeKey,
                  timeSinceLastProcess: now - lastProcessed,
                });
                return;
              }
              (processedMessageIds.current as any)[dedupeKey] = now;

              console.log("👥🚪 MEMBER EXIT EVENT DETECTED!", {
                dedupeKey,
                messageId: msg.id,
                exitedUserId,
                currentUserId: userId,
                exitedUserName,
                groupName,
                conversationId: msg.conversation_id,
                isCurrentUser: exitedUserId === userId,
                userIdType: typeof userId,
                exitedUserIdType: typeof exitedUserId,
              });

              if (exitedUserId === userId) {
                const currentConversation =
                  useChatStore.getState().conversations[msg.conversation_id];
                if (currentConversation) {
                  useChatStore.getState().setConversation(msg.conversation_id, {
                    ...currentConversation,
                    is_user_member: false,
                  } as any);
                }

                const currentMembers =
                  useChatStore.getState().members[msg.conversation_id] || [];
                const updatedMembers = currentMembers.filter((m: any) => {
                  const memberId =
                    m.user_id || m.UserID || m.user?.id || m.User?.id;
                  return memberId !== userId;
                });
                useChatStore
                  .getState()
                  .setMembers(msg.conversation_id, updatedMembers);

                const conversationInList = conversations.find(
                  (item) => item.Conversation.id === msg.conversation_id,
                );
                if (conversationInList) {
                  useConversationsStore
                    .getState()
                    .updateConversation(msg.conversation_id, {
                      ...conversationInList.Conversation,
                      is_user_member: false,
                    } as any);
                }

                useChatStore.setState((state) => ({
                  _version: state._version + 1,
                }));

                toast.success(`Left group`, {
                  description: `You left ${groupName}. You can still view the chat history.`,
                });

                addOrUpdateMessage(msg.conversation_id, {
                  ...msg,
                  content: `You left the group`,
                  message_type: "system",
                  is_system_message: true,
                  status: "sent" as const,
                });

                setLastMessage(msg.conversation_id, {
                  ...msg,
                  content: `You left the group`,
                });
              } else {
                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      useChatStore
                        .getState()
                        .setMembers(
                          msg.conversation_id,
                          conversationData.Members || [],
                        );

                      if (conversationData.Conversation) {
                        useChatStore
                          .getState()
                          .setConversation(msg.conversation_id, {
                            ...conversationData.Conversation,
                            members: conversationData.Members,
                          });
                      }
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "Failed to refresh conversation members:",
                      error,
                    );
                  });

                const formattedMsg = {
                  ...msg,
                  content: `${exitedUserName} left the group`,
                  status: "sent" as const,
                };
                addOrUpdateMessage(msg.conversation_id, formattedMsg);

                setLastMessage(msg.conversation_id, formattedMsg);

                triggerNotification(formattedMsg);
              }

              return;
            }

            // Handle member removed event
            const isMemberRemovedMessage =
              msg.content?.startsWith("member_removed:");
            if (isSystemMessage && isMemberRemovedMessage) {
              // Format: "member_removed:{userID}:{userName}:{groupName}"
              const parts = msg.content.split(":");
              const removedUserId = parts[1];
              const removedUserName = parts[2];
              const groupName = parts[3];

              // Create unique key for deduplication based on event + conversationId + userId
              const dedupeKey = `removed_${msg.conversation_id}_${removedUserId}`;

              // Prevent duplicate processing - check if processed in last 5 seconds
              const now = Date.now();
              const lastProcessed = (processedMessageIds.current as any)[
                dedupeKey
              ];
              if (lastProcessed && now - lastProcessed < 5000) {
                console.log("⏭️ Skipping duplicate member_removed event:", {
                  dedupeKey,
                  timeSinceLastProcess: now - lastProcessed,
                });
                return;
              }
              (processedMessageIds.current as any)[dedupeKey] = now;

              console.log("👥❌ MEMBER REMOVED EVENT DETECTED!", {
                dedupeKey,
                messageId: msg.id,
                removedUserId,
                currentUserId: userId,
                removedUserName,
                groupName,
                conversationId: msg.conversation_id,
                isCurrentUser: removedUserId === userId,
                userIdType: typeof userId,
                removedUserIdType: typeof removedUserId,
              });

              // Check if current user is the one removed
              if (removedUserId === userId) {
                // Current user was removed from group - mark as not member
                console.log(
                  "🚫 Current user removed from group, marking as not member...",
                  {
                    removedUserId,
                    currentUserId: userId,
                    conversationId: msg.conversation_id,
                  },
                );

                // IMMEDIATELY mark user as not member (don't wait for API)
                const currentConversation =
                  useChatStore.getState().conversations[msg.conversation_id];
                if (currentConversation) {
                  useChatStore.getState().setConversation(msg.conversation_id, {
                    ...currentConversation,
                    is_user_member: false, // Flag to indicate user is no longer member
                  } as any);
                  console.log("✅ Set is_user_member to FALSE in chat store");
                }

                // Update members list - remove current user from members
                const currentMembers =
                  useChatStore.getState().members[msg.conversation_id] || [];
                const updatedMembers = currentMembers.filter((m: any) => {
                  const memberId =
                    m.user_id || m.UserID || m.user?.id || m.User?.id;
                  return memberId !== userId;
                });
                useChatStore
                  .getState()
                  .setMembers(msg.conversation_id, updatedMembers);
                console.log("✅ Removed current user from members list:", {
                  before: currentMembers.length,
                  after: updatedMembers.length,
                });

                // IMPORTANT: Keep conversation in useConversationsStore (sidebar)
                // Update the conversation in conversations list to mark as not member
                const conversationInList = conversations.find(
                  (item) => item.Conversation.id === msg.conversation_id,
                );
                if (conversationInList) {
                  // Update existing conversation with is_user_member flag
                  useConversationsStore
                    .getState()
                    .updateConversation(msg.conversation_id, {
                      ...conversationInList.Conversation,
                      is_user_member: false,
                    } as any);
                  console.log(
                    "✅ Set is_user_member to FALSE in conversations store",
                  );
                }

                // Force increment version to trigger re-render
                useChatStore.setState((state) => ({
                  _version: state._version + 1,
                }));
                console.log("✅ Force re-render triggered");

                // Show toast notification
                toast.error(`Removed from group`, {
                  description: `You were removed from ${groupName}. You can still view the chat history.`,
                });

                // Add system message to chat (make sure it's marked as system message)
                addOrUpdateMessage(msg.conversation_id, {
                  ...msg,
                  content: `You were removed from the group`,
                  message_type: "system",
                  is_system_message: true,
                  status: "sent" as const,
                });
              } else {
                // Another user was removed - refresh the member list
                console.log(
                  "👤 Another user removed from group, refreshing conversation...",
                );

                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      // Update members in chat store
                      useChatStore
                        .getState()
                        .setMembers(
                          msg.conversation_id,
                          conversationData.Members || [],
                        );

                      // Update conversation in chat store
                      if (conversationData.Conversation) {
                        useChatStore
                          .getState()
                          .setConversation(msg.conversation_id, {
                            ...conversationData.Conversation,
                            members: conversationData.Members,
                          });
                      }

                      console.log(
                        "✅ Members updated for conversation:",
                        msg.conversation_id,
                      );
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "Failed to refresh conversation members:",
                      error,
                    );
                  });

                // Add system message to chat
                const formattedMsg = {
                  ...msg,
                  content: `${removedUserName} was removed from the group`,
                  status: "sent" as const,
                };
                addOrUpdateMessage(msg.conversation_id, formattedMsg);

                // Update last message in sidebar
                setLastMessage(msg.conversation_id, formattedMsg);

                triggerNotification(formattedMsg);
              }

              // Don't process further for member removed events
              return;
            }

            // Handle member promoted or demoted event
            const isMemberPromotedMessage = msg.content?.startsWith("member_promoted:");
            const isMemberDemotedMessage = msg.content?.startsWith("member_demoted:");
            if (isSystemMessage && (isMemberPromotedMessage || isMemberDemotedMessage)) {
              const parts = msg.content.split(":");
              const targetUserId = parts[1];
              const targetUserName = parts[2];
              const newRole = isMemberPromotedMessage ? "admin" : "member";

              console.log(`👥🔄 MEMBER ${isMemberPromotedMessage ? "PROMOTED" : "DEMOTED"} EVENT DETECTED!`, {
                conversationId: msg.conversation_id,
                targetUserId,
                targetUserName,
                newRole,
              });

              // Optimistically update the members list in Zustand store
              const chatStore = useChatStore.getState();
              const currentMembers = chatStore.members[msg.conversation_id] || [];
              const updatedMembers = currentMembers.map((m) => {
                const mId = (m as any).user_id || (m as any).UserID || (m as any).user?.id || (m as any).User?.id;
                if (mId === targetUserId) {
                  return { ...m, role: newRole };
                }
                return m;
              });

              chatStore.setMembers(msg.conversation_id, updatedMembers);

              // Also refresh from API to ensure complete accuracy
              getConversationById(msg.conversation_id, userId)
                .then((response) => {
                  if (response?.status && response?.data) {
                    const conversationData = response.data;
                    chatStore.setMembers(msg.conversation_id, conversationData.Members || []);
                    if (conversationData.Conversation) {
                      chatStore.setConversation(msg.conversation_id, {
                        ...conversationData.Conversation,
                        members: conversationData.Members,
                      });
                    }
                    console.log("✅ Members list updated from API after promote/demote");
                  }
                })
                .catch((error) => {
                  console.error("Failed to refresh conversation members:", error);
                });

              // Force increment version to trigger re-render
              useChatStore.setState((state) => ({
                _version: state._version + 1,
              }));

              // Add the message to chat
              const formattedContent = `${targetUserName} was ${isMemberPromotedMessage ? "promoted to Admin" : "demoted to User"}`;
              const formattedMsg = {
                ...msg,
                content: formattedContent,
                status: "sent" as const,
              };
              addOrUpdateMessage(msg.conversation_id, formattedMsg);

              // Update last message in sidebar
              setLastMessage(msg.conversation_id, formattedMsg);

              triggerNotification(formattedMsg);

              return;
            }

            // Check if user is still a member of this conversation (for removed users)
            const chatStoreConversation =
              useChatStore.getState().conversations[msg.conversation_id];
            const isUserNotMember =
              chatStoreConversation &&
              (chatStoreConversation as any).is_user_member === false;

            if (isUserNotMember && msg.message_type !== "system") {
              console.log(
                "🚫 User is not a member of this conversation - ignoring message:",
                msg.conversation_id,
                msg.id,
              );
              // Still update last message in conversations store for display
              setLastMessage(msg.conversation_id, msg);
              return; // Don't process further if user is not a member
            }

            // Check if message already exists in store
            const convMsgs =
              useChatStore.getState().messages[msg.conversation_id] || [];
            const existingMessage = convMsgs.find((m) => m.id === msg.id);

            if (existingMessage) {
              // Message already exists, just update it
              console.log("🔄 Message already exists, updating:", msg.id);
              addOrUpdateMessage(msg.conversation_id, {
                ...msg,
                status: "sent" as const,
              });
            } else {
              // New message, check if there's an optimistic message to replace
              const optimisticMessage = convMsgs.find(
                (m) =>
                  m.sender_id === msg.sender_id &&
                  m.conversation_id === msg.conversation_id &&
                  (messageType === "e2ee_text"
                    ? m.message_type === "e2ee_text" || !m.status || m.status === "pending" || m.status === "sending"
                    : m.content === msg.content) &&
                  (m.status === "pending" ||
                    !m.status ||
                    m.status === "sending"),
              );

              if (optimisticMessage) {
                // Replace optimistic message with real message
                console.log(
                  "🔄 Found optimistic message to replace:",
                  optimisticMessage.id,
                  "→",
                  msg.id,
                );

                useChatStore
                  .getState()
                  .replaceOptimisticMessage(
                    msg.conversation_id,
                    optimisticMessage.id,
                    msg,
                  );
              } else {
                // Add as new message
                console.log("➕ Adding NEW message from GlobalWebSocket:", {
                  id: msg.id,
                  conversationId: msg.conversation_id,
                  content: msg.content,
                  sender: msg.sender?.first_name,
                });
                addOrUpdateMessage(msg.conversation_id, {
                  ...msg,
                  status: "sent" as const,
                });
              }
            }

            // Check if conversation exists in the list (using getState() to avoid stale closures)
            const conversationExists = useConversationsStore.getState().conversations.some(
              (item) => item.Conversation.id === msg.conversation_id,
            );

            // AI Bot user ID - we don't want to show AI conversations in sidebar
            const AI_BOT_USER_ID = "1196e18b-c1dc-41aa-946a-0c55e9d64fe6";
            const isAIBotMessage = msg.sender_id === AI_BOT_USER_ID;

            if (!conversationExists) {
              // Check if this conversation exists in chat store but user is not a member
              const chatStoreConversation =
                useChatStore.getState().conversations[msg.conversation_id];
              const isUserNotMember =
                chatStoreConversation &&
                (chatStoreConversation as any).is_user_member === false;

              if (isUserNotMember) {
                console.log(
                  "🚫 User is not a member of this conversation - skipping fetch:",
                  msg.conversation_id,
                );
                return; // Don't fetch conversation if user is not a member
              }

              // Skip fetching and adding AI conversation to list
              if (isAIBotMessage) {
                console.log(
                  "🤖 AI Bot message detected - skipping conversation list update:",
                  msg.conversation_id,
                );
                return; // Don't add AI conversation to sidebar
              }

              // Conversation is new, fetch it from API
              console.log(
                "🆕 New conversation detected:",
                msg.conversation_id,
                "- Fetching details...",
              );

              // Prevent duplicate fetches
              if (!fetchingConversations.current.has(msg.conversation_id)) {
                fetchingConversations.current.add(msg.conversation_id);

                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      // Double check: filter out AI Assistant conversation
                      const isAIAssistant =
                        conversationData.display_name === "AI Assistant" ||
                        conversationData.Conversation?.name ===
                          "AI Assistant" ||
                        conversationData.other_user_id === AI_BOT_USER_ID;

                      if (isAIAssistant) {
                        console.log(
                          "🤖 AI Assistant conversation detected - NOT adding to sidebar:",
                          conversationData,
                        );
                        return; // Don't add to list
                      }

                      // Create RecentConversation object
                      const newConversation: RecentConversation = {
                        Conversation: {
                          id: conversationData.Conversation.id,
                          name: conversationData.Conversation.name,
                          avatar_url: conversationData.Conversation.avatar_url,
                          is_group: conversationData.Conversation.is_group,
                          is_cross_tenant:
                            conversationData.Conversation.is_cross_tenant,
                          created_by: conversationData.Conversation.created_by,
                          created_at: conversationData.Conversation.created_at,
                          updated_at: conversationData.Conversation.updated_at,
                          members: conversationData.Conversation.members,
                          messages: conversationData.Conversation.messages,
                          display_name:
                            conversationData.display_name ||
                            conversationData.Conversation.name,
                          display_avatar:
                            conversationData.display_avatar ||
                            conversationData.Conversation.avatar_url,
                          unread_count: msg.sender_id === userId ? 0 : 1,
                        } as any,
                        LastMessage: msg,
                      };

                      // Add to conversation list
                      addNewConversation(newConversation);
                      console.log(
                        "✅ New conversation added to list:",
                        msg.conversation_id,
                      );

                      // Show toast notification for new conversation
                      /* toast.success("New conversation", {
                        description: `${msg.sender.first_name} ${msg.sender.last_name} started a conversation`,
                      }); */
                    }
                  })
                  .catch((error) => {
                    console.error("Failed to fetch new conversation:", error);

                    // If error is 500, likely user is not authorized (not a member)
                    // Mark conversation as not accessible
                    if (error?.response?.status === 500) {
                      console.log(
                        "🚫 User not authorized to access conversation (likely not a member):",
                        msg.conversation_id,
                      );

                      // Mark in chat store as not a member
                      useChatStore
                        .getState()
                        .setConversation(msg.conversation_id, {
                          id: msg.conversation_id,
                          name: "Group Chat",
                          avatar_url: "",
                          is_group: true,
                          is_cross_tenant: false,
                          created_by: "",
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          members: [],
                          messages: null,
                          is_user_member: false, // Mark as not a member
                        } as any);
                    }
                  })
                  .finally(() => {
                    fetchingConversations.current.delete(msg.conversation_id);
                  });
              }
            } else {
              // Skip updating last message for AI conversation (no unread badge)
              if (isAIBotMessage) {
                console.log(
                  "🤖 AI Bot message - skipping last message update in sidebar",
                );
                return; // Don't update last message/unread count in sidebar
              }

              // Conversation exists, update last message and unread count
              setLastMessage(msg.conversation_id, msg, userId);

              // Trigger notification for incoming messages from others
              triggerNotification(msg);
            }
          }
        } catch (err) {
          console.error("Failed to parse global WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        // Suppress error 0 which is just a generic connection failure
        if (event && (event as any).type) {
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

        // Don't reconnect if explicitly closed (code 1000)
        if (event.code === 1000 || !shouldReconnect.current) {
          return;
        }

        if (isMounted.current && shouldReconnect.current) {
          reconnectAttempts.current += 1;
          if (reconnectAttempts.current <= maxReconnectAttempts) {
            console.log(
              `Reconnecting global WebSocket attempt ${reconnectAttempts.current}/${maxReconnectAttempts}...`,
            );
            setTimeout(connectWebSocket, reconnectInterval);
          } else {
            console.error("Max global WebSocket reconnection attempts reached");
            shouldReconnect.current = false;
          }
        }
      };
    } catch (error) {
      console.error("Failed to create global WebSocket connection:", error);
      wsRef.current = null;

      // Retry connection if allowed
      if (isMounted.current && shouldReconnect.current) {
        reconnectAttempts.current += 1;
        if (reconnectAttempts.current <= maxReconnectAttempts) {
          setTimeout(connectWebSocket, reconnectInterval);
        } else {
          shouldReconnect.current = false;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only userId - all others use refs or direct calls

  useEffect(() => {
    if (!userId || userId.trim() === "") {
      console.log("⏸️ Skipping WebSocket - no userId");
      return;
    }

    console.log("🔄 Global WebSocket Effect Triggered for:", userId);
    shouldReconnect.current = true;
    isMounted.current = true;
    
    // Request native OS notification permissions (floating windows) on mount
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          console.log("🔔 Floating notification permission status:", perm);
        });
      }
    }

    // Only connect if not already connected/connecting
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }

    return () => {
      console.log("🧹 Cleanup Global WebSocket Effect");
      isMounted.current = false;
      shouldReconnect.current = false;
      // Don't close immediately on unmount in dev mode to prevent strict mode double-invoke issues
      // But in production we should. For now, let's be safer.
      if (wsRef.current) {
        console.log("🔌 Closing global WebSocket connection due to unmount/change");
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
        setConnected(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // STRICTLY only userId. setConnected is stable from store.

  // Return connection status and sendMessage function
  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage: sendMessageStable,
  };
}
