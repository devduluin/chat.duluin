// utils/linkify.tsx
import React from "react";
import { ExternalLink } from "lucide-react";
import { useContactsStore } from "@/store/useContactStore";

// Regular expression to detect URLs
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Regular expression to detect Bold (**text**)
const BOLD_REGEX = /\*\*(.*?)\*\*/g;

export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // combined approach: match both URLs and Bold markers
  // This is a simplified approach that handles them at the same level
  const COMBINED_REGEX = new RegExp(
    `(${URL_REGEX.source})|(${BOLD_REGEX.source})`,
    "gi"
  );

  while ((match = COMBINED_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    const urlMatch = match[1];
    const boldFullMatch = match[2];
    const boldContent = match[3];
    const index = match.index;

    // Add text before the match
    if (index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex, index)}</span>
      );
    }

    if (urlMatch) {
      // Add the URL as a clickable link
      parts.push(
        <a
          key={`link-${index}`}
          href={urlMatch}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 underline hover:underline-offset-4 transition-all break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {urlMatch}
          <ExternalLink className="ml-1 h-3 w-3 inline-block flex-shrink-0" />
        </a>
      );
    } else if (boldFullMatch) {
      // Add bold text
      // We can recursively call a simplified version for links inside bold if needed, 
      // but for now, let's keep it simple as per user request
      parts.push(
        <strong key={`bold-${index}`} className="font-bold">
          {boldContent}
        </strong>
      );
    }

    lastIndex = COMBINED_REGEX.lastIndex;
  }

  // Add remaining text after the last match
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [text];
}

function getContactName(userId: string, fallbackName: string): string {
  if (!userId) return fallbackName;
  try {
    const { contacts } = useContactsStore.getState();
    const found = contacts?.find((c) => {
      const targetId = c.target?.id || (c as any).target_id || (c as any).TargetID;
      return targetId && targetId === userId;
    });
    if (found) {
      const firstName = (found as any).first_name || (found as any).FirstName || found.target?.first_name || "";
      const lastName = (found as any).last_name || (found as any).LastName || found.target?.last_name || "";
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
    }
  } catch (err) {
    // Fail silently
  }
  return fallbackName;
}

export function parseSystemMessage(content: string): string {
  if (!content) return "";
  
  if (content.startsWith("member_added:")) {
    const parts = content.split(":");
    const userId = parts[1] || "";
    const userName = getContactName(userId, parts[2] || "A member");
    return `${userName} was added to the group`;
  }
  
  if (content.startsWith("member_removed:")) {
    const parts = content.split(":");
    const userId = parts[1] || "";
    const userName = getContactName(userId, parts[2] || "A member");
    return `${userName} was removed from the group`;
  }
  
  if (content.startsWith("member_exit:")) {
    const parts = content.split(":");
    const userId = parts[1] || "";
    const userName = getContactName(userId, parts[2] || "A member");
    return `${userName} left the group`;
  }
  
  if (content.startsWith("member_promoted:")) {
    const parts = content.split(":");
    const userId = parts[1] || "";
    const userName = getContactName(userId, parts[2] || "A member");
    return `${userName} was promoted to Admin`;
  }
  
  if (content.startsWith("member_demoted:")) {
    const parts = content.split(":");
    const userId = parts[1] || "";
    const userName = getContactName(userId, parts[2] || "A member");
    return `${userName} was demoted to User`;
  }
  
  if (content.startsWith("conversation_updated:")) {
    const text = content.replace("conversation_updated:", "");
    return `Conversation name ${text}`;
  }
  
  return content;
}

// Alternative function that returns HTML string (for sidebar preview)
export function linkifyTextToPlainPreview(
  text: string,
  maxLength = 50
): string {
  if (!text) return "";

  // Parse system message if any
  let cleanText = parseSystemMessage(text);

  // Remove Bold markers for preview
  cleanText = cleanText.replace(BOLD_REGEX, "$1");

  // Remove URLs and replace with placeholder for sidebar
  cleanText = cleanText.replace(URL_REGEX, "🔗 Link");

  // Truncate if too long
  if (cleanText.length > maxLength) {
    return cleanText.slice(0, maxLength) + "...";
  }

  return cleanText;
}
