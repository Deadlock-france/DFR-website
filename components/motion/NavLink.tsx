"use client";

import type { LucideIcon } from "lucide-react";

import AppLink from "@/components/AppLink";
import { buttonVariants } from "@/components/shadcn/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { navRevealLabelTransition } from "@/lib/layout/nav-dock";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "motion/react";

interface NavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed?: boolean;
  orientation?: "horizontal" | "vertical";
  animated?: boolean;
}

export default function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed = false,
  orientation = "horizontal",
  animated = true,
}: NavLinkProps) {
  const reduceMotion = useReducedMotion();
  const vertical = orientation === "vertical";
  const animateLabel = animated && !reduceMotion;

  const iconSlot = (
    <span className="relative grid size-10 shrink-0 place-items-center">
      {active ? (
        <span
          className="absolute inset-0 z-0 rounded-[14px] border"
          style={{
            backgroundColor: "#3A7D6509",
            borderColor: "#3A7D6504",
          }}
        />
      ) : null}

      <Icon
        className={cn("relative z-1 size-5", active && "text-[#6BB89A]")}
        size={20}
      />
    </span>
  );

  const linkClassName = cn(
    buttonVariants({ variant: "ghost", size: "sm" }),
    "relative min-w-0 overflow-visible rounded-lg text-sm font-medium tracking-[-0.01em] transition-colors hover:bg-[color:var(--nav-hover)]",
    active ? "font-semibold text-foreground" : "text-muted-foreground",
    vertical
      ? cn(
          "min-h-12 w-full",
          collapsed ? "justify-center px-1" : "justify-start gap-2.5 px-2.5",
        )
      : "justify-center px-2.5 sm:px-3.5",
  );

  const labelSlot = vertical ? (
    <span
      className="min-w-0 overflow-hidden whitespace-nowrap text-left text-ellipsis"
      style={{
        flex: collapsed ? "0 0 0px" : "1 1 auto",
        maxWidth: collapsed ? 0 : 180,
        opacity: collapsed ? 0 : 1,
        ...navRevealLabelTransition(animateLabel, collapsed, "0.06s"),
        pointerEvents: collapsed ? "none" : "auto",
      }}
    >
      {label}
    </span>
  ) : (
    <span className="hidden sm:inline">{label}</span>
  );

  const link = (
    <AppLink
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={linkClassName}
    >
      {iconSlot}
      {labelSlot}
    </AppLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <AppLink
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={linkClassName}
            />
          }
        >
          {iconSlot}
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
