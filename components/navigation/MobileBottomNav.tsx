"use client";

import {
  Gamepad2,
  Home,
  Newspaper,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Suspense,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";

import AccountMenuPanel from "@/components/account/AccountMenuPanel";
import AppLink from "@/components/AppLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { Button, buttonVariants } from "@/components/shadcn/button";
import { DiscordIcon, XIcon } from "@/components/social/SocialIcons";
import { useVisualViewportBottomInset } from "@/hooks/use-visual-viewport-bottom-inset";
import type { AccountDockUser } from "@/lib/account/types";
import { profileDisplayName } from "@/lib/account/types";
import {
  navDockClassName,
  navDockStyle,
  navIconButtonClassName,
} from "@/lib/layout/nav-dock";
import { isActivePath } from "@/lib/layout/sidebar";
import { DISCORD_INVITE_URL, TWITTER_URL } from "@/lib/social/links";
import { cn } from "@/lib/utils";

const NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/patch-notes", label: "Patch notes", icon: Newspaper },
  { href: "/showmatch", label: "Showmatch", icon: Gamepad2 },
];

const SOCIAL_LINKS: ReadonlyArray<{
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { href: DISCORD_INVITE_URL, label: "Discord", icon: DiscordIcon },
  { href: TWITTER_URL, label: "X / Twitter", icon: XIcon },
];

type PopupKind = "socials" | "account" | null;

type PopupPosition = {
  bottom: number;
  left: number;
};

function MobileBottomNavInner({
  user,
  pathname,
}: {
  user: AccountDockUser | null;
  pathname: string;
}) {
  const vvBottom = useVisualViewportBottomInset();
  const [popup, setPopup] = useState<PopupKind>(null);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  const socialsId = useId();
  const accountId = useId();
  const barRef = useRef<HTMLElement>(null);
  const socialsTriggerRef = useRef<HTMLButtonElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPopup(null);
  }, [pathname]);

  useLayoutEffect(() => {
    if (!popup) {
      setPopupPosition(null);
      return;
    }

    const trigger =
      popup === "socials"
        ? socialsTriggerRef.current
        : accountTriggerRef.current;

    function updatePosition() {
      const rect = trigger?.getBoundingClientRect();
      if (!rect) return;

      const popupWidth = 208;
      const centerX = rect.left + rect.width / 2;
      const left = Math.min(
        Math.max(12, centerX - popupWidth / 2),
        window.innerWidth - popupWidth - 12,
      );

      setPopupPosition({
        bottom: window.innerHeight - rect.top + 10 + vvBottom,
        left,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [popup, vvBottom]);

  useEffect(() => {
    if (!popup) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        barRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }
      setPopup(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPopup(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [popup]);

  const initials = user
    ? profileDisplayName({
        display_name: user.displayLabel,
        global_name: null,
        username: null,
      })
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const popupNode =
    mounted && popup && popupPosition
      ? createPortal(
          <div
            ref={popupRef}
            id={popup === "socials" ? socialsId : accountId}
            role={popup === "account" ? "menu" : "dialog"}
            aria-label={popup === "socials" ? "Réseaux sociaux" : undefined}
            className="fixed z-100 w-52 overflow-hidden rounded-2xl border backdrop-blur-[20px]"
            style={{
              bottom: popupPosition.bottom,
              left: popupPosition.left,
              borderColor: "var(--border-nav-glass)",
              backgroundColor: "var(--bg-nav-glass)",
              boxShadow: "var(--shadow-nav-dock)",
            }}
          >
            {popup === "socials" ? (
              <div className="flex flex-col p-1.5">
                {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm text-foreground no-underline transition-colors hover:bg-[color:var(--nav-hover)]"
                    onClick={() => setPopup(null)}
                  >
                    <Icon className="size-4 opacity-80" />
                    {label}
                  </a>
                ))}
              </div>
            ) : user ? (
              <AccountMenuPanel
                user={user}
                onNavigate={() => setPopup(null)}
              />
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <nav
        ref={barRef}
        aria-label="Navigation mobile"
        className="pointer-events-none fixed inset-x-0 z-40 flex justify-center md:hidden"
        style={{
          bottom: vvBottom,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
        }}
      >
        <div
          className={cn(
            navDockClassName,
            "pointer-events-auto flex-row items-center gap-0.5 rounded-[28px] px-2 py-1.5",
          )}
          style={navDockStyle}
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <AppLink
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                  "size-11 rounded-2xl",
                  navIconButtonClassName,
                  active && "text-[#6BB89A]",
                )}
              >
                <span className="relative grid size-full place-items-center">
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-1 rounded-[14px] border"
                      style={{
                        backgroundColor: "#3A7D6509",
                        borderColor: "#3A7D6504",
                      }}
                    />
                  ) : null}
                  <Icon className="relative z-1 size-5" />
                </span>
              </AppLink>
            );
          })}

          <Button
            ref={socialsTriggerRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Réseaux"
            aria-expanded={popup === "socials"}
            aria-controls={socialsId}
            onClick={() =>
              setPopup((current) => (current === "socials" ? null : "socials"))
            }
            className={cn(
              "size-11 rounded-2xl",
              navIconButtonClassName,
              popup === "socials" && "text-foreground",
            )}
          >
            <Share2 className="size-5" />
          </Button>

          {!user ? (
            <a
              href="/auth/login?next=/profil"
              aria-label="Connexion"
              className={cn(
                buttonVariants({ size: "icon-sm" }),
                "size-11 rounded-2xl border-0 text-white shadow-none",
              )}
              style={{ backgroundColor: "#5865F2" }}
            >
              <DiscordIcon className="size-5" />
            </a>
          ) : (
            <Button
              ref={accountTriggerRef}
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Menu profil"
              aria-expanded={popup === "account"}
              aria-controls={accountId}
              onClick={() =>
                setPopup((current) =>
                  current === "account" ? null : "account",
                )
              }
              className={cn(
                "size-11 overflow-hidden rounded-2xl p-0",
                navIconButtonClassName,
              )}
            >
              <Avatar size="sm" className="size-full rounded-2xl">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="rounded-2xl text-[0.65rem]">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          )}
        </div>
      </nav>
      {popupNode}
    </>
  );
}

/** usePathname exige un Suspense parent avec Cache Components. */
function MobileBottomNavConnected({
  user,
}: {
  user: AccountDockUser | null;
}) {
  const pathname = usePathname();
  return <MobileBottomNavInner user={user} pathname={pathname} />;
}

export default function MobileBottomNav({
  user,
}: {
  user: AccountDockUser | null;
}) {
  return (
    <Suspense
      fallback={<MobileBottomNavInner user={user} pathname="" />}
    >
      <MobileBottomNavConnected user={user} />
    </Suspense>
  );
}
