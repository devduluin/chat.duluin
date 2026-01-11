// utils/linkify.tsx
import React from "react";
import { ExternalLink } from "lucide-react";

// Regular expression to detect URLs
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex lastIndex
  const regex = new RegExp(URL_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const url = match[0];
    const index = match.index;

    // Add text before the URL
    if (index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex, index)}</span>
      );
    }

    // Add the URL as a clickable link
    parts.push(
      <a
        key={`link-${index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-blue-400 hover:text-blue-300 underline hover:underline-offset-4 transition-all break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
        <ExternalLink className="ml-1 h-3 w-3 inline-block flex-shrink-0" />
      </a>
    );

    lastIndex = regex.lastIndex;
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [text];
}

// Alternative function that returns HTML string (for sidebar preview)
export function linkifyTextToPlainPreview(
  text: string,
  maxLength = 50
): string {
  if (!text) return "";

  // Remove URLs and replace with placeholder for sidebar
  const withoutUrls = text.replace(URL_REGEX, "🔗 Link");

  // Truncate if too long
  if (withoutUrls.length > maxLength) {
    return withoutUrls.slice(0, maxLength) + "...";
  }

  return withoutUrls;
}
