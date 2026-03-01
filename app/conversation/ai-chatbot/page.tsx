// app/conversation/ai-chatbot/page.tsx
"use client";

import { Sidebar } from "@/components/chat/Sidebar";
import { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bot, ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { sendToNLP } from "@/services/nlpService";
import {
  getOrCreateAIConversation,
  getAIConversationMessages,
  saveAIMessage,
  AIMessage,
} from "@/services/aiConversationService";
import { useAccountStore } from "@/store/useAccountStore";
import Cookies from "js-cookie";
import { formatRelativeTime } from "@/utils/formatDate";
import { toast } from "sonner";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useChatStore } from "@/store/useChatStore";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  intent?: string;
}

export default function AIChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: account } = useAccountStore();
  const { isOnline } = useOfflineQueueStore();
  const { sendMessage, isConnected } = useWebSocketStore();

  const userIdFromCookies =
    typeof window !== "undefined" ? Cookies.get("user_id") || "" : "";
  const userId = userIdFromCookies;

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for incoming WebSocket messages
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        // If the message is a Blob, we can't parse it synchronously here
        // The global handler in useGlobalMessageSocket should have handled it
        if (event.data instanceof Blob) return;

        const response = JSON.parse(event.data);
        
        // Check if this is a message for our current conversation
        if (
          response.status && 
          response.message === "New message" && 
          response.data && 
          response.data.conversation_id === conversationId
        ) {
          const msgData = response.data;
          
          // Determine role based on sender_id
          // AI Bot ID: 1196e18b-c1dc-41aa-946a-0c55e9d64fe6
          const isBot = msgData.sender_id === "1196e18b-c1dc-41aa-946a-0c55e9d64fe6";
          const isMe = msgData.sender_id === userId;
          
          if (isBot) {
            // It's a response from AI
            const newMsg: ChatMessage = {
              id: msgData.id,
              role: "assistant",
              content: msgData.content,
              timestamp: msgData.created_at,
            };
            
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              const updated = [...prev, newMsg];
              localStorage.setItem("ai-messages", JSON.stringify(updated));
              return updated;
            });
            
            setIsLoading(false); // Stop loading when AI responds
          } else if (isMe) {
            // It's my message confirmed by server (optional: update status)
            // For now we just ensure it's in the list
          }
        }
      } catch (error) {
        console.error("Error parsing WS message:", error);
      }
    };

    // We can't directly add event listener to the WebSocket instance here easily 
    // because it's managed by useGlobalMessageSocket/useWebSocketStore.
    // However, the global socket hook updates the store.
    // 
    // Ideally, we should use a custom event or a store subscription.
    // For this implementation, we'll rely on the fact that useConversationsStore 
    // or useChatStore might be updated by the global socket.
    
    // BUT, for a direct "listen" in this component without refactoring the whole socket architecture:
    // We can add a window event listener that the global socket *could* dispatch, 
    // OR we can poll/subscribe to the store.
    
    // Let's implement a custom event listener that useGlobalMessageSocket dispatches
    // (We need to modify useGlobalMessageSocket to dispatch 'ai-message-received' or similar)
    // OR: simpler approach for now -> we trust the store updates if we were using the chat store.
    // Since this page manages its own state `messages`, we need to sync.
    
    // WORKAROUND: We'll add a listener to the WebSocket object if we can access it, 
    // but it's hidden in closure.
    // ALTERNATIVE: The Global Socket Logic handles the "onmessage".
    
    // Let's rely on `useChatStore` updates if possible, or add a listener to a custom event.
    // Since we didn't modify GlobalSocket to dispatch custom events, we'll use a specific approach:
    // We will assume the GlobalSocket updates the `useChatStore` or `useConversationsStore`.
    // Let's check `useChatStore`.
    
    // Actually, looking at `useGlobalMessageSocket.ts`, it calls `addOrUpdateMessage` in `useChatStore`.
    // So we can subscribe to `useChatStore` changes!
  }, [conversationId, userId]);

  // Subscribe to ChatStore updates to get real-time messages
  const chatMessages = useChatStore((state) => conversationId ? state.messages[conversationId] : []);
  
  useEffect(() => {
    if (conversationId && chatMessages && chatMessages.length > 0) {
      // Convert store messages to local ChatMessage format
      const mappedMessages: ChatMessage[] = chatMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.sender_id === userId ? "user" : "assistant",
        content: msg.content,
        timestamp: msg.created_at,
      }));
      
      // We only want to update if we have *new* messages to avoid overwriting optimistic updates or causing loops
      // But since we are moving to WS, we should trust the store more.
      
      // Filter out messages we already have to prevent flicker, OR just replace.
      // Let's replace for simplicity but keep "isLoading" logic separate.
      
      // Check if we received a new AI message to stop loading
      const lastMsg = mappedMessages[mappedMessages.length - 1];
      if (lastMsg && lastMsg.role === "assistant" && isLoading) {
        setIsLoading(false);
      }
      
      setMessages(mappedMessages);
      localStorage.setItem("ai-messages", JSON.stringify(mappedMessages));
    }
  }, [chatMessages, conversationId, userId, isLoading]);


  // Initialize AI conversation
  useEffect(() => {
    const initConversation = async () => {
      try {
        setIsInitializing(true);

        // Load from localStorage first
        const cachedMessages = localStorage.getItem("ai-messages");
        const cachedConvId = localStorage.getItem("ai-conversation-id");

        if (cachedMessages) {
          const parsed = JSON.parse(cachedMessages);
          setMessages(parsed);
        } else {
          // Show welcome message
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "Halo! Saya Citra, AI Personal Assistant Anda. Ada yang bisa saya bantu hari ini?",
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        if (cachedConvId) {
          setConversationId(cachedConvId);
        }

        // If online, sync with backend
        if (isOnline) {
          const conversation = await getOrCreateAIConversation();

          if (conversation) {
            setConversationId(conversation.id);
            localStorage.setItem("ai-conversation-id", conversation.id);

            // Load existing messages
            const result = await getAIConversationMessages(
              conversation.id,
              100,
              0
            );
            if (result && result.messages.length > 0) {
              // Convert messages to ChatMessage format
              const chatMessages: ChatMessage[] = result.messages
                .reverse()
                .map((msg: AIMessage) => ({
                  id: msg.id,
                  role: msg.sender_id === userId ? "user" : "assistant",
                  content: msg.content,
                  timestamp: msg.created_at,
                }));
              setMessages(chatMessages);
              localStorage.setItem("ai-messages", JSON.stringify(chatMessages));
            }
          }
        } else {
          // Offline mode - use placeholder conversation ID if needed
          if (!cachedConvId) {
            const offlineConvId = `offline-ai-${Date.now()}`;
            setConversationId(offlineConvId);
            localStorage.setItem("ai-conversation-id", offlineConvId);
          }
          console.log("📴 Offline mode - using cached AI conversation");
        }
      } catch (error) {
        console.error("Failed to initialize AI conversation:", error);
        // Don't show error toast in offline mode
        if (isOnline) {
          toast.error("Gagal menginisialisasi AI conversation");
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initConversation();
  }, [userId, isOnline]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || !conversationId || !userId) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputText,
      timestamp: new Date().toISOString(),
    };

    // Optimistic update
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const messageContent = inputText;
    setInputText("");
    setIsLoading(true);

    try {
      // Save messages to localStorage immediately
      localStorage.setItem("ai-messages", JSON.stringify(newMessages));

      // Only send to backend if online
      if (isOnline) {
        if (isConnected && sendMessage) {
          // 🚀 SEND VIA WEBSOCKET
          console.log("🚀 Sending AI message via WebSocket...");
          const success = sendMessage({
            type: "ai_message",
            conversation_id: conversationId,
            content: messageContent
          });
          
          if (!success) {
             throw new Error("Failed to send via WebSocket");
          }
          
          // Note: We don't manually add the response here anymore.
          // We wait for the WebSocket broadcast to update the store -> update this component.
          
        } else {
          // Fallback to HTTP if WS not connected
          console.warn("⚠️ WebSocket not connected, falling back to HTTP...");
          
          // Save user message to database
          await saveAIMessage(conversationId, userId, messageContent, "text");

          // Get auth token if available
          const token =
            typeof window !== "undefined" ? Cookies.get("app_token") || "" : "";
          const authorization = token ? `Bearer ${token}` : undefined;

          // Send to NLP service
          const response = await sendToNLP(messageContent, userId, authorization);

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content:
              response.message ||
              "Maaf, saya tidak bisa memproses permintaan Anda saat ini.",
            timestamp: new Date().toISOString(),
            intent: response.intent,
          };

          const updatedMessages = [...newMessages, assistantMessage];
          setMessages(updatedMessages);
          localStorage.setItem("ai-messages", JSON.stringify(updatedMessages));
          setIsLoading(false);

          // Get bot user ID from database seeder output
          const botUserId = "1196e18b-c1dc-41aa-946a-0c55e9d64fe6"; // AI Assistant bot user ID

          // Save AI response to database
          await saveAIMessage(
            conversationId,
            botUserId,
            assistantMessage.content,
            "text"
          );
        }
      } else {
        // Offline mode - show message that it will be processed later
        const offlineMessage: ChatMessage = {
          id: `offline-${Date.now()}`,
          role: "assistant",
          content:
            "Anda sedang offline. Pesan Anda akan diproses ketika kembali online.",
          timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...newMessages, offlineMessage];
        setMessages(updatedMessages);
        localStorage.setItem("ai-messages", JSON.stringify(updatedMessages));
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "Maaf, terjadi kesalahan saat menghubungi AI Assistant.",
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
      localStorage.setItem("ai-messages", JSON.stringify(updatedMessages));
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isInitializing) {
    return (
      <>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Memuat AI conversation...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  AI Assistant
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    Bot
                  </span>
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Powered by Duluin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              🔌 Anda sedang offline - Pesan akan diproses ketika kembali online
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[70%] ${
                  message.role === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <Avatar
                    src={account?.avatar_url || ""}
                    name={`${account?.first_name || "User"} ${
                      account?.last_name || ""
                    }`}
                    size="sm"
                  />
                )}
                <div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(message.timestamp)}
                    </span>
                    {message.intent && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {message.intent}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 max-w-[70%]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      AI sedang berpikir...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="flex items-end space-x-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ketik pesan Anda..."
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
          </p>
        </div>
      </div>
    </>
  );
}
