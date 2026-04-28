// utils/linkify.tsx
import React from "react";
import { ExternalLink } from "lucide-react";

// URL regex (used for plain preview stripping)
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Combined regex: **bold**, *italic*, `code`, URL — matched in priority order
const MARKDOWN_REGEX =
  /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|((https?:\/\/[^\s]+))/g;

/**
 * Parses a message string and returns React nodes with:
 * - **bold** → <strong>
 * - *italic* → <em>
 * - `code` → <code>
 * - https://... → clickable <a>
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  const regex = new RegExp(MARKDOWN_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    const index = match.index;

    // Add plain text before this match
    if (index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex, index)}</span>
      );
    }

    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={`bold-${index}`} className="font-bold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={`italic-${index}`} className="italic">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      // `code`
      parts.push(
        <code
          key={`code-${index}`}
          className="bg-black/20 dark:bg-white/10 rounded px-1 py-0.5 text-sm font-mono"
        >
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      // URL
      const url = match[8];
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
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining plain text after last match
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Returns a plain string preview for sidebars/notifications.
 * Strips markdown formatting and replaces URLs with 🔗 Link.
 */
export function linkifyTextToPlainPreview(
  text: string,
  maxLength = 50
): string {
  if (!text) return "";

  const plain = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(URL_REGEX, "🔗 Link");

  if (plain.length > maxLength) {
    return plain.slice(0, maxLength) + "...";
  }

  return plain;
}
