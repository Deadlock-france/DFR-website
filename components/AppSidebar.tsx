"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Gamepad2,
  Heart,
  Home,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useSyncExternalStore, type ComponentType } from "react";

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
import { useHydrated } from "@/hooks/use-hydrated";
import {
  NAV_WIDTH_TRANSITION,
  navDockClassName,
  navDockStyle,
  navIconButtonClassName,
  navRevealLabelTransition,
} from "@/lib/layout/nav-dock";
import {
  getSidebarOpenServerSnapshot,
  getSocialMinifiedServerSnapshot,
  isActivePath,
  readSidebarOpen,
  readSocialMinified,
  setSidebarOpen,
  setSocialMinified,
  subscribeSidebarOpen,
  subscribeSocialMinified,
} from "@/lib/layout/sidebar";
import {
  DISCORD_INVITE_URL,
  DONATE_URL,
  STEAM_STORE_URL,
  TWITTER_URL,
} from "@/lib/social/links";
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
  children,
}: {
  title: string;
  label: string;
  onClick: () => void;
  expanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClick}
            aria-label={label}
            aria-expanded={expanded}
            className={cn("rounded-xl", navIconButtonClassName)}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}

function SocialIconLinks({
  orientation,
  tooltipSide = "right",
}: {
  orientation: "horizontal" | "vertical";
  tooltipSide?: "right" | "top";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        orientation === "horizontal" ? "flex-row px-0.5" : "flex-col",
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
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "rounded-[14px]",
                  orientation === "horizontal" ? "h-10 flex-1" : undefined,
                  navIconButtonClassName,
                )}
              />
            }
          >
            <Icon className="size-5" />
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/** Navigation seule : usePathname peut suspendre sans démonter le chrome. */
function SidebarNav({
  collapsed,
  animated,
}: {
  collapsed: boolean;
  animated: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto",
        collapsed && "-mx-0.5",
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
          orientation="vertical"
          animated={animated}
        />
      ))}
    </nav>
  );
}

function SidebarNavFallback({
  collapsed,
  animated,
}: {
  collapsed: boolean;
  animated: boolean;
}) {
  return (
    <nav
      aria-label="Sections"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto",
        collapsed && "-mx-0.5",
      )}
    >
      {NAV_ITEMS.map(({ href, label, icon }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          icon={icon}
          active={false}
          collapsed={collapsed}
          orientation="vertical"
          animated={animated}
        />
      ))}
    </nav>
  );
}

function AppSidebarInner() {
  const reduceMotion = useReducedMotion();
  const open = useSyncExternalStore(
    subscribeSidebarOpen,
    readSidebarOpen,
    getSidebarOpenServerSnapshot,
  );
  const socialMinified = useSyncExternalStore(
    subscribeSocialMinified,
    readSocialMinified,
    getSocialMinifiedServerSnapshot,
  );
  const hydrated = useHydrated();

  function toggleSidebar() {
    setSidebarOpen(!open);
  }

  function toggleSocialMinified() {
    setSocialMinified(!socialMinified);
  }

  const collapsed = !open;
  // L'état réel n'est connu qu'après lecture du localStorage : sans ce garde,
  // le passage à l'état replié est joué comme une transition à chaque chargement.
  const animated = hydrated && !reduceMotion;

  return (
    <div
      className={cn(
        "sticky top-0 hidden shrink-0 md:block",
        collapsed ? "w-[76px]" : "w-[252px]",
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
            collapsed ? "p-2.5" : "p-3",
          )}
        >
          <div className="mb-4 flex min-h-10 items-center gap-2.5">
            <Link
              href="/"
              className="flex min-w-0 flex-1 items-center gap-2.5 text-inherit no-underline"
            >
              <div
                className="size-[38px] shrink-0 overflow-hidden rounded-[10px] border shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
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
                  <source
                    src="/assets/animated-logo-CXGSyufY.webm"
                    type="video/webm"
                  />
                  <source
                    src="/assets/animated-logo-TlyMLKqV.mp4"
                    type="video/mp4"
                  />
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
                <p className="truncate text-sm leading-tight font-bold tracking-tight text-foreground">
                  Deadlock Actus
                </p>
              </div>
            </Link>

            <div
              className={cn(
                "shrink-0 overflow-hidden",
                collapsed ? "w-0 opacity-0" : "w-8 opacity-100",
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
              >
                <ChevronLeft size={20} />
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
              >
                <ChevronRight size={20} />
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
            <p className="block px-1.5 text-[0.65rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Menu
            </p>
          </div>

          <Suspense
            fallback={
              <SidebarNavFallback collapsed={collapsed} animated={animated} />
            }
          >
            <SidebarNav collapsed={collapsed} animated={animated} />
          </Suspense>

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
            {!collapsed ? (
              <>
                <div className="flex items-center justify-between gap-1 px-1.5">
                  <p className="text-[0.65rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                    Réseaux
                  </p>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={toggleSocialMinified}
                          aria-label={
                            socialMinified
                              ? "Agrandir les réseaux"
                              : "Réduire les réseaux"
                          }
                          aria-expanded={!socialMinified}
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                        />
                      }
                    >
                      {socialMinified ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {socialMinified
                        ? "Agrandir les réseaux"
                        : "Réduire les réseaux"}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {socialMinified ? (
                  <SocialIconLinks orientation="horizontal" tooltipSide="top" />
                ) : (
                  <SidebarSocialCard />
                )}
              </>
            ) : (
              <SocialIconLinks orientation="vertical" />
            )}

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
                        buttonVariants({ variant: "outline", size: "icon" }),
                        "rounded-[14px]",
                        navIconButtonClassName,
                      )}
                    />
                  }
                >
                  <Heart size={20} />
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
                  "h-10 w-full gap-1.5 border-0 px-2.5 text-[0.8125rem] font-semibold text-white shadow-none transition-[filter] hover:brightness-110",
                )}
                style={{ backgroundColor: "#4A9B7F" }}
              >
                <Heart className="size-4" />
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
                        buttonVariants({ variant: "outline", size: "icon" }),
                        "rounded-[14px]",
                        navIconButtonClassName,
                      )}
                    />
                  }
                >
                  <ExternalLink size={20} />
                </TooltipTrigger>
                <TooltipContent side="right">Steam</TooltipContent>
              </Tooltip>
            ) : (
              <a
                href={STEAM_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center justify-between rounded-[10px] border px-2.5 py-2.5 text-[0.8125rem] font-medium text-muted-foreground no-underline transition-[background-color,color]",
                  navIconButtonClassName,
                )}
              >
                Steam Store
                <ExternalLink className="opacity-70" size={16} />
              </a>
            )}
          </div>
        </div>
      </NavDock>
    </div>
  );
}

/**
 * Chrome stable hors Suspense : seul le marquage actif (usePathname) peut
 * suspendre, sans rejouer open/fermé ni minify des réseaux.
 */
export default function AppSidebar() {
  return <AppSidebarInner />;
}
