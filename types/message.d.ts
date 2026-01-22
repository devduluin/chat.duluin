// types/message.d.ts

// Extend existing Message interface to include new status types
declare global {
  interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender: User;
    content: string;
    message_type?: string;
    status?: "pending" | "sending" | "sent" | "failed";
    created_at?: string | Date;
    updated_at?: string | Date;
    read_at?: string | Date | null;
    parent_message_id?: string | null;
    attachments?: Attachment[];
    reactions?: Reaction[];
  }
}

export {};
