export interface WsResponse {
  status?: string;
  message?: string;
  data?: unknown;
  errors?: unknown;
}

export interface RecentConversation {
  Conversation: any;
  LastMessage: Message;
}

export interface RefValue<T> {
  current: T;
}

export interface WsHandlerContext {
  userId: string;
  ringState: RefValue<boolean>;
  processedMessageIds: RefValue<Record<string, number>>;
  fetchingConversations: RefValue<Set<string>>;
  setIsSyncing: (syncing: boolean) => void;
  playIncomingCallSound: () => void;
  triggerNotification: (msg: Message) => void;
  addOrUpdateMessage: (conversationId: string, message: Message) => void;
  setLastMessage: (
    conversationId: string,
    message: Message,
    currentUserId?: string,
  ) => void;
  addNewConversation: (conversation: RecentConversation) => void;
}
