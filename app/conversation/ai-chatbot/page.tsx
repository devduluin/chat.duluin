// app/conversation/ai-chatbot/page.tsx
"use client";

import { Sidebar } from "@/components/chat/Sidebar";
import { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bot, ArrowLeft, Send, Loader2, ChevronDown } from "lucide-react";
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

const EMPTY_MESSAGES: any[] = [];

// Secure and lightweight Markdown-to-React parser to render bold, strikethrough, and italic correctly
const renderFormattedMessage = (content: string) => {
  if (!content) return null;

  const lines = content.split('\n');

  return lines.map((line, lineIndex) => {
    // Regex for bold (**), strikethrough (~~), double underscore italic (__), single underscore italic (_), single asterisk italic (*)
    const regex = /(\*\*.*?\*\*|~~.*?~~|__.*?__|_[^_]+?_|\*[^*]+?\*)/g;
    const parts = line.split(regex);

    const renderedLine = parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIndex} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('~~') && part.endsWith('~~')) {
        return <del key={partIndex} className="line-through opacity-80">{part.slice(2, -2)}</del>;
      }
      if (part.startsWith('__') && part.endsWith('__')) {
        return <em key={partIndex} className="italic">{part.slice(2, -2)}</em>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={partIndex} className="italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={partIndex} className="italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });

    return (
      <div key={lineIndex} className="min-h-[1.25rem]">
        {renderedLine}
      </div>
    );
  });
};

export default function AIChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [agentRole, setAgentRole] = useState<"employee" | "company" | "accounting">("employee");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: account } = useAccountStore();
  const { isOnline } = useOfflineQueueStore();
  const { sendMessage, isConnected } = useWebSocketStore();

  const userIdFromCookies =
    typeof window !== "undefined" ? Cookies.get("user_id") || "" : "";
  const userId = userIdFromCookies;
  const hrisCompany = account?.accounts?.hris_company || account?.account?.hris_company || account?.hris_company;
  const hrisEmployee = account?.accounts?.hris_employee || account?.account?.hris_employee || account?.hris_employee;
  const hrisAccounting = account?.accounts?.duluin_accounting || account?.account?.duluin_accounting || account?.duluin_accounting;

  // Role Configurations (Highly Scalable for 3+ apps in the future)
  const rolesConfig = [
    {
      id: "employee" as const,
      label: "Tanya sebagai Karyawan",
      icon: "👤",
      description: "Absensi, slip gaji, & cuti pribadi Anda",
      dotClass: "bg-blue-500",
      activeText: "text-blue-600 dark:text-blue-400",
      activeBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50"
    },
    {
      id: "company" as const,
      label: "Tanya sebagai Perusahaan (HRD)",
      icon: "🏢",
      description: "Analisis performa & kehadiran karyawan",
      dotClass: "bg-purple-500",
      activeText: "text-purple-600 dark:text-purple-400",
      activeBg: "bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/50"
    },
    {
      id: "accounting" as const,
      label: "Tanya sebagai Akuntan (Accounting)",
      icon: "📊",
      description: "Analisis laporan & keuangan perusahaan",
      dotClass: "bg-emerald-500",
      activeText: "text-emerald-600 dark:text-emerald-400",
      activeBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50"
    }
  ];

  const allowedRoles = rolesConfig.filter(role => {
    if (role.id === "employee") {
      return hrisEmployee && hrisEmployee.secondary_id && hrisEmployee.secondary_id.trim() !== "" && hrisEmployee.is_active === true;
    }
    if (role.id === "company") {
      return hrisCompany && hrisCompany.secondary_id && hrisCompany.secondary_id.trim() !== "" && hrisCompany.is_active === true;
    }
    if (role.id === "accounting") {
      return hrisAccounting && hrisAccounting.secondary_id && hrisAccounting.secondary_id.trim() !== "" && hrisAccounting.is_active === true;
    }
    return false;
  });

  const activeRoleConfig = rolesConfig.find(r => r.id === agentRole) || rolesConfig[0];

  // Dynamic fallback: set agentRole to the first allowed role if current role is not allowed
  useEffect(() => {
    if (allowedRoles.length > 0 && !allowedRoles.some(r => r.id === agentRole)) {
      setAgentRole(allowedRoles[0].id);
    }
  }, [allowedRoles, agentRole]);

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
  const chatMessages = useChatStore((state) =>
    conversationId
      ? state.messages[conversationId] || EMPTY_MESSAGES
      : EMPTY_MESSAGES
  );

  // Subscribe to typing users to show "AI sedang berpikir" in real-time
  const typingUsersMap = useChatStore((state) => state.typingUsers);
  const typingUsers = conversationId ? typingUsersMap?.[conversationId] || {} : {};
  const isAITyping = Object.keys(typingUsers).includes("1196e18b-c1dc-41aa-946a-0c55e9d64fe6");

  // Scroll to bottom when AI starts thinking/typing
  useEffect(() => {
    if (isAITyping) {
      scrollToBottom();
    }
  }, [isAITyping]);

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
            content: messageContent,
            agent_role: agentRole
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
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex-1 flex items-center justify-center h-screen w-full">
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
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col h-screen w-full">
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
                  Citra
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

        {/* Premium Role Selector Dropdown (Supports 3+ apps seamlessly) */}
        {allowedRoles.length > 1 && (
          <div className="flex justify-between items-center py-2.5 px-4 sm:px-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 transition-all duration-300">
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                Mode Obrolan:
              </span>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold transition-all duration-300 flex items-center gap-2 border shadow-sm ${activeRoleConfig.activeBg} ${activeRoleConfig.activeText}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeRoleConfig.dotClass} animate-pulse flex-shrink-0`}></span>
                  <span className="whitespace-nowrap">{activeRoleConfig.icon} {activeRoleConfig.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-300 flex-shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </Button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-64 sm:w-72 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800/80 rounded-2xl shadow-xl z-40 py-2 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800/60 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Pilih Sudut Pandang AI
                        </span>
                      </div>
                      {allowedRoles.map((role) => {
                        const isActive = role.id === agentRole;
                        return (
                          <button
                            key={role.id}
                            className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 flex items-start gap-3 transition-colors duration-200 ${isActive ? "bg-gray-50 dark:bg-gray-800/50" : ""
                              }`}
                            onClick={() => {
                              setAgentRole(role.id);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className="text-lg mt-0.5">{role.icon}</span>
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-xs font-semibold ${isActive ? role.activeText : "text-gray-700 dark:text-gray-300"}`}>
                                {role.label}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal leading-normal">
                                {role.description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Premium Indicator Badge - Hidden on small mobile screens to prevent cramming */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-semibold shadow-sm whitespace-nowrap flex-shrink-0">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping"></span>
              ✨ AI Multi-App Hub
            </div>
          </div>
        )}

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
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                }`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[70%] ${message.role === "user"
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
                    name={`${account?.first_name || "User"} ${account?.last_name || ""
                      }`}
                    size="sm"
                  />
                )}
                <div>
                  <div
                    className={`rounded-lg px-4 py-2 ${message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                      }`}
                  >
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {renderFormattedMessage(message.content)}
                    </div>
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

          {(isLoading || isAITyping) && (
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
