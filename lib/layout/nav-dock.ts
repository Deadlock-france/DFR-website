import type { CSSProperties } from "react";

export const NAV_WIDTH_TRANSITION = "0.28s cubic-bezier(0.22, 1, 0.36, 1)";

export function navRevealLabelTransition(
  animated: boolean,
  collapsed: boolean,
  delay = "0.08s",
): CSSProperties {
  if (!animated) {
    return {};
  }

  const transitionDelay = collapsed ? "0s, 0s, 0s" : `${delay}, ${delay}, ${delay}`;

  return {
    transitionProperty: "max-width, opacity, flex",
    transitionDuration: "0.28s, 0.2s, 0.28s",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1), ease, ease",
    transitionDelay,
  };
}

export const navDockStyle = {
  borderColor: "var(--border-nav-glass)",
  backgroundColor: "var(--bg-nav-glass)",
  backgroundImage: "var(--bg-nav-bg)",
  boxShadow: "var(--shadow-nav-dock)",
} as const;

export const navDockClassName =
  "flex flex-col overflow-hidden rounded-[30px] border backdrop-blur-[20px]";

export const navIconButtonClassName =
  "border-[color:var(--nav-border)] text-muted-foreground hover:bg-[color:var(--nav-hover)] hover:text-foreground";
