import { avatarColor, getInitials } from "@/lib/utils";

export function CommunityAvatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.4 }}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}
