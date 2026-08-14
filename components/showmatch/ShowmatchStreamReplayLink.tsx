import { TwitchIcon } from "@/components/social/SocialIcons";
import { parseStreamChannel } from "@/lib/showmatch/stream-channel";
import { cn } from "@/lib/utils";

export default function ShowmatchStreamReplayLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const channel = parseStreamChannel(href);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group mx-auto mt-5 inline-flex max-w-full items-center gap-3 border border-[#9146FF]/45 bg-[#9146FF]/12 px-4 py-2.5 transition-colors",
        "hover:border-[#9146FF]/80 hover:bg-[#9146FF]/22",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center bg-[#9146FF]/25 text-[#d4b8ff]">
        <TwitchIcon className="size-5" />
      </span>
      <span className="min-w-0 text-left">
        <span className="block font-colus text-sm uppercase tracking-wide text-[#e8d8ff]">
          Regarder la rediffusion
        </span>
        <span className="mt-0.5 block truncate text-xs text-[#c4a8f0]">
          {channel.platform === "twitch" ? `@${channel.label}` : channel.label}
        </span>
      </span>
    </a>
  );
}
