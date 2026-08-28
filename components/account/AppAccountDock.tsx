"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import AccountMenuPanel from "@/components/account/AccountMenuPanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { Button, buttonVariants } from "@/components/shadcn/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { DiscordIcon } from "@/components/social/SocialIcons";
import type { AccountDockUser } from "@/lib/account/types";
import { profileDisplayName } from "@/lib/account/types";
import {
  navDockClassName,
  navDockStyle,
  navIconButtonClassName,
} from "@/lib/layout/nav-dock";
import { cn } from "@/lib/utils";

export type { AccountDockUser };

type MenuPosition = {
  top: number;
  right: number;
};

export default function AppAccountDock({
  user,
}: {
  user: AccountDockUser | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const initials = user
    ? profileDisplayName({
        display_name: user.displayLabel,
        global_name: null,
        username: null,
      })
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const menu =
    mounted && menuOpen && user && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            className="fixed z-100 w-52 overflow-hidden rounded-2xl border backdrop-blur-[20px]"
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
              borderColor: "var(--border-nav-glass)",
              backgroundColor: "var(--bg-nav-glass)",
              boxShadow: "var(--shadow-nav-dock)",
            }}
          >
            <AccountMenuPanel
              user={user}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>,
          document.body,
        )
      : null;

  if (pathname === "/profil") return null;

  return (
    <>
      <div
        ref={rootRef}
        className="pointer-events-none fixed top-3 right-3 z-40 hidden sm:top-4 sm:right-4 md:block"
      >
        <div
          aria-label="Compte joueur"
          className={cn(navDockClassName, "pointer-events-auto p-1.5")}
          style={navDockStyle}
        >
          {!user ? (
            <a
              href="/auth/login?next=/profil"
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-9 gap-2 rounded-xl border-0 px-3 text-sm font-semibold text-white no-underline shadow-none transition-[filter] hover:brightness-110",
              )}
              style={{ backgroundColor: "#5865F2" }}
            >
              <DiscordIcon className="size-4" />
              Connexion
            </a>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    ref={triggerRef}
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Menu profil"
                    aria-expanded={menuOpen}
                    aria-controls={menuId}
                    onClick={() => setMenuOpen((open) => !open)}
                    className={cn(
                      "size-9 overflow-hidden rounded-xl p-0",
                      navIconButtonClassName,
                    )}
                  />
                }
              >
                <Avatar size="sm" className="size-full rounded-xl">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="rounded-xl text-[0.65rem]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom">Mon profil</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {menu}
    </>
  );
}
