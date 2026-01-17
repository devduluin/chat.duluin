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
  saveAIMessage,
  getAIConversationMessages,
  AIMessage,
} from "@/services/aiConversationService";
import { useAccountStore } from "@/store/useAccountStore";
import Cookies from "js-cookie";
import { formatRelativeTime } from "@/utils/formatDate";
import { toast } from "sonner";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";

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

        // Get bot user ID from database seeder output
        const botUserId = "1196e18b-c1dc-41aa-946a-0c55e9d64fe6"; // AI Assistant bot user ID

        // Save AI response to database
        await saveAIMessage(
          conversationId,
          botUserId,
          assistantMessage.content,
          "text"
        );
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
      }
    } catch (error) {
      console.error("Failed to send message to NLP:", error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "Maaf, terjadi kesalahan saat menghubungi AI Assistant. Pastikan NLP Service sedang berjalan.",
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
      localStorage.setItem("ai-messages", JSON.stringify(updatedMessages));
    } finally {
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
