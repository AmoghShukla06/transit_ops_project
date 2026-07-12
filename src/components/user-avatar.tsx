import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Shows the account's Google profile photo when set, otherwise a solid initials
 * circle. Uses a plain <img> (not next/image) so no remote-domain config is needed
 * for Google's image CDN.
 */
export function UserAvatar({
  name,
  picture,
  className,
}: {
  name: string;
  picture?: string | null;
  className?: string;
}) {
  if (picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={picture}
        alt={name}
        referrerPolicy="no-referrer"
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
