import { cx } from "class-variance-authority";

interface AvatarProps {
  src?: any;
  name?: string;
  size?: "sm" | "md" | "lg";
  isOnline?: boolean;
  className?: string;
}

function getColorFromName(name: string) {
  // Generate consistent color based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export function Avatar({
  src,
  name = "",
  size = "md",
  isOnline,
  className,
}: AvatarProps) {
  const initials = name.trim()
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "?";

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={name || "Avatar"}
          className={cx(
            "rounded-full object-cover",
            sizeClasses[size],
            className
          )}
        />
      ) : (
        <div
          style={{ backgroundColor: getColorFromName(name) }}
          className={cx(
            "rounded-full flex items-center justify-center text-white font-medium",
            sizeClasses[size]
          )}
        >
          {initials}
        </div>
      )}

      {isOnline && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800" />
      )}
    </div>
  );
}
