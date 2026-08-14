import Image from "next/image";

import { buttonVariants } from "@/components/shadcn/button";
import { DiscordIcon, XIcon } from "@/components/social/SocialIcons";
import { DISCORD_INVITE_URL, TWITTER_URL } from "@/lib/social/links";
import { cn } from "@/lib/utils";

const CARD_IMAGE = "/assets/social-bg-image.webp";

export default function SidebarSocialCard({
  className,
}: {
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "overflow-hidden rounded-[14px] border border-[color:var(--nav-border)] bg-black/25",
        className,
      )}
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={CARD_IMAGE}
          alt=""
          fill
          sizes="220px"
          className="object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-[#0d1315] via-[#0d1315]/55 to-transparent"
        />
      </div>

      <div className="-mt-6 relative z-1 flex flex-col gap-2.5 px-2.5 pb-2.5">
        <div>
          <p className="text-[0.8125rem] font-semibold leading-snug text-foreground">
            Communauté francophone
          </p>
          <p className="mt-0.5 text-[0.7rem] leading-snug text-muted-foreground">
            Matchmaking, events et actus entre joueurs francophones.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-8 w-full gap-1.5 border-0 px-2 text-[0.75rem] font-semibold text-white shadow-none transition-[filter] hover:brightness-110",
            )}
            style={{ backgroundColor: "#5865F2" }}
          >
            <DiscordIcon className="size-3.5" />
            Rejoindre Discord
          </a>

          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-8 w-full gap-1.5 border-0 px-2 text-[0.75rem] font-semibold text-white shadow-none transition-[filter] hover:brightness-110",
            )}
            style={{ backgroundColor: "#111111" }}
          >
            <XIcon className="size-3.5" />
            Suivre @DeadlockFR
          </a>
        </div>
      </div>
    </aside>
  );
}
