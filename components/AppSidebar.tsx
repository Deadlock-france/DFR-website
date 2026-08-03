"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Home,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ComponentType } from "react";
import NavLink from "@/components/motion/NavLink";
import { Button, buttonVariants } from "@/components/shadcn/button";
import { Separator } from "@/components/shadcn/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { DiscordIcon, XIcon } from "@/components/social/SocialIcons";
import SidebarSocialCard from "@/components/social/SidebarSocialCard";
import {
  NAV_WIDTH_TRANSITION,
  navDockClassName,
  navDockStyle,
  navIconButtonClassName,
  navRevealLabelTransition,
} from "@/lib/layout/nav-dock";
import {
  getSidebarOpenServerSnapshot,
  isActivePath,
  readSidebarOpen,
  setSidebarOpen,
  subscribeSidebarOpen,
} from "@/lib/layout/sidebar";
import {
  DISCORD_INVITE_URL,
  DONATE_URL,
  STEAM_STORE_URL,
  TWITTER_URL,
} from "@/lib/social/links";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/patch-notes", label: "Patch notes", icon: Newspaper },
  //{ href: "/team", label: "Équipe", icon: Users },
  //{ href: "/showmatch", label: "Showmatch", icon: Gamepad2 },
  //{ href: "/items", label: "Items", icon: ShoppingBag },
  //{ href: "/unban", label: "Déban", icon: Gavel },
];

const SOCIAL_LINKS: ReadonlyArray<{
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { href: DISCORD_INVITE_URL, label: "Discord", icon: DiscordIcon },
  { href: TWITTER_URL, label: "X / Twitter", icon: XIcon },
];

function NavDock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      aria-label="Navigation principale"
      className={cn(navDockClassName, "h-full", className)}
      style={navDockStyle}
    >
      {children}
    </aside>
  );
}

function SidebarIconButton({
  title,
  label,
  onClick,
  expanded,
  enlargedOnMobile = false,
  children,
}: {
  title: string;
  label: string;
  onClick: () => void;
  expanded: boolean;
  enlargedOnMobile?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onClick}
            aria-label={label}
            aria-expanded={expanded}
            className={cn(
              "rounded-xl",
              navIconButtonClassName,
              enlargedOnMobile && "max-md:size-11 max-md:[&_svg]:size-5",
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const open = useSyncExternalStore(
    subscribeSidebarOpen,
    readSidebarOpen,
    getSidebarOpenServerSnapshot,
  );
  const hydrated = useHydrated();

  function toggleSidebar() {
    setSidebarOpen(!open);
  }

  const collapsed = !open;
  const mobileExpanded = !collapsed;
  // L'état réel n'est connu qu'après lecture du localStorage : sans ce garde,
  // le passage à l'état replié est joué comme une transition à chaque chargement.
  const animated = hydrated && !reduceMotion;

  // La sidebar fait partie du châssis permanent : pas d'animation d'entrée,
  // sinon elle rejoue à chaque chargement comme un changement de page.
  return (
    <>
      {mobileExpanded ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
          onClick={toggleSidebar}
        />
      ) : null}

      <div
        className={cn(
          "sticky top-0 shrink-0",
          collapsed
            ? "w-[76px] max-md:w-[88px]"
            : "z-50 w-full max-md:fixed max-md:inset-y-0 max-md:left-0 md:w-[252px]",
        )}
        style={{
          height: "100vh",
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 12,
          paddingRight: collapsed ? 8 : 4,
          transition: animated ? `width ${NAV_WIDTH_TRANSITION}` : undefined,
        }}
      >
        <NavDock className={!collapsed ? "w-full" : undefined}>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            collapsed ? "p-2.5" : "p-3 max-md:p-5",
          )}
        >
          <div
            className={cn(
              "mb-4 flex min-h-10 items-center gap-2.5",
              !collapsed && "max-md:mb-6 max-md:min-h-14 max-md:gap-3.5",
            )}
          >
            <Link
              href="/"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 text-inherit no-underline",
                !collapsed && "max-md:gap-4",
              )}
            >
              <div
                className={cn(
                  "size-[38px] shrink-0 overflow-hidden rounded-[10px] border shadow-[0_2px_8px_rgba(0,0,0,0.25)]",
                  !collapsed && "max-md:size-[52px] max-md:rounded-[14px]",
                  collapsed && "max-md:size-[44px] max-md:rounded-xl",
                )}
                style={{ borderColor: "#FFFFFF01" }}
              >
                <video
                  autoPlay
                  playsInline
                  muted
                  loop
                  aria-label="Logo Deadlock France"
                  className="block size-full object-cover"
                >
                  <source src="/assets/animated-logo-CXGSyufY.webm" type="video/webm" />
                  <source src="/assets/animated-logo-TlyMLKqV.mp4" type="video/mp4" />
                </video>
              </div>

              <div
                className="min-w-0 overflow-hidden"
                style={{
                  flex: collapsed ? "0 0 0px" : "1 1 auto",
                  maxWidth: collapsed ? 0 : undefined,
                  opacity: collapsed ? 0 : 1,
                  ...navRevealLabelTransition(animated, collapsed),
                  pointerEvents: collapsed ? "none" : "auto",
                }}
              >
                <p
                  className={cn(
                    "truncate leading-tight font-bold tracking-tight text-foreground",
                    collapsed ? "text-sm" : "text-sm max-md:text-lg",
                  )}
                >
                  Deadlock Actus
                </p>
              </div>
            </Link>

            <div
              className={cn(
                "shrink-0 overflow-hidden",
                collapsed ? "w-0 opacity-0" : "w-8 max-md:w-11 opacity-100",
              )}
              style={{
                transition: animated
                  ? `width ${NAV_WIDTH_TRANSITION}, opacity 0.15s ease`
                  : undefined,
                pointerEvents: collapsed ? "none" : "auto",
              }}
            >
              <SidebarIconButton
                title="Réduire le menu"
                label="Réduire le menu"
                onClick={toggleSidebar}
                expanded={open}
                enlargedOnMobile
              >
                <ChevronLeft className="max-md:size-5" size={18} />
              </SidebarIconButton>
            </div>
          </div>

          {collapsed ? (
            <div className="mb-3 self-center">
              <SidebarIconButton
                title="Ouvrir le menu"
                label="Ouvrir le menu"
                onClick={toggleSidebar}
                expanded={open}
                enlargedOnMobile
              >
                <ChevronRight className="max-md:size-5" size={18} />
              </SidebarIconButton>
            </div>
          ) : null}

          <div
            className="overflow-hidden"
            style={{
              maxHeight: collapsed ? 0 : 28,
              opacity: collapsed ? 0 : 1,
              marginBottom: collapsed ? 0 : 8,
              transition: animated
                ? `max-height ${NAV_WIDTH_TRANSITION}, opacity 0.18s ease, margin 0.28s ease`
                : undefined,
            }}
          >
            <p
              className={cn(
                "block px-1.5 font-bold tracking-[0.14em] text-muted-foreground uppercase",
                collapsed ? "text-[0.65rem]" : "text-[0.65rem] max-md:text-xs",
              )}
            >
              Menu
            </p>
          </div>

          <nav
            aria-label="Sections"
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto",
              collapsed && "-mx-0.5"
            )}
          >
            {NAV_ITEMS.map(({ href, label, icon }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={isActivePath(pathname, href)}
                collapsed={collapsed}
                enlargedOnMobile
                orientation="vertical"
                animated={animated}
              />
            ))}
          </nav>

          <Separator
            className="my-3"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
          />

          <div
            className={cn(
              "flex flex-col gap-2",
              collapsed ? "items-center" : "items-stretch",
            )}
          >
            <div
              className="overflow-hidden"
              style={{
                maxHeight: collapsed ? 0 : 300,
                opacity: collapsed ? 0 : 1,
                marginBottom: collapsed ? 0 : 2,
                transition: animated
                  ? `max-height ${NAV_WIDTH_TRANSITION}, opacity 0.18s ease, margin 0.28s ease`
                  : undefined,
                pointerEvents: collapsed ? "none" : "auto",
              }}
            >
              <SidebarSocialCard />
            </div>

            <div
              className={cn(
                collapsed ? "flex" : "hidden",
                "flex-col items-center gap-2",
              )}
              aria-label="Réseaux sociaux"
            >
              {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                <Tooltip key={href}>
                  <TooltipTrigger
                    render={
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "icon-sm" }),
                          "rounded-[14px] max-md:size-11 max-md:[&_svg]:size-5",
                          navIconButtonClassName,
                        )}
                      />
                    }
                  >
                    <Icon className="size-[18px] max-md:size-5" />
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            {collapsed ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <a
                      href={DONATE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Faire un don"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "icon-sm" }),
                        "rounded-[14px] max-md:size-11 max-md:[&_svg]:size-5",
                        navIconButtonClassName,
                      )}
                    />
                  }
                >
                  <Heart className="max-md:size-5" size={18} />
                </TooltipTrigger>
                <TooltipContent side="right">Soutenir le projet</TooltipContent>
              </Tooltip>
            ) : (
              <a
                href={DONATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "h-9 w-full gap-1.5 border-0 px-2.5 text-[0.8125rem] font-semibold text-white shadow-none transition-[filter] hover:brightness-110 max-md:h-11 max-md:text-base",
                )}
                style={{ backgroundColor: "#4A9B7F" }}
              >
                <Heart className="size-3.5 max-md:size-4" />
                Soutenir le projet
              </a>
            )}

            {collapsed ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <a
                      href={STEAM_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ouvrir la page Steam"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "icon-sm" }),
                        "rounded-[14px] max-md:size-11 max-md:[&_svg]:size-5",
                        navIconButtonClassName,
                      )}
                    />
                  }
                >
                  <ExternalLink className="max-md:size-5" size={18} />
                </TooltipTrigger>
                <TooltipContent side="right">Steam</TooltipContent>
              </Tooltip>
            ) : (
              <a
                href={STEAM_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center justify-between rounded-[10px] border px-2.5 py-2 text-[0.8125rem] font-medium text-muted-foreground no-underline transition-[background-color,color]",
                  navIconButtonClassName,
                  "max-md:px-3.5 max-md:py-3 max-md:text-base",
                )}
              >
                Steam Store
                <ExternalLink className="opacity-70 max-md:size-[18px]" size={15} />
              </a>
            )}
          </div>
        </div>
        </NavDock>
      </div>
    </>
  );
}
