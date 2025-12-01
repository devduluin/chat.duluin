export const formatFullDate = (date: Date, locale: string = "en-GB", timeZone: string = "Asia/Jakarta") => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(locale, {
      timeZone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
  }).format(date);
};

export const formatDate = (date: Date, locale: string = "en-GB", timeZone: string = "Asia/Jakarta") => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(locale, {
      timeZone,
      year: "numeric",
      month: "long",
      day: "numeric",
  }).format(date);
};

export const formatTime = (date: Date, locale: string = "en-GB", timeZone: string = "Asia/Jakarta") => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "numeric",
      minute: "numeric",
       
  }).format(date) + ' WIB';
};

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);

  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  // Fallback: show exact date (optional)
  return past.toLocaleDateString(); // e.g., "6/4/2025"
}