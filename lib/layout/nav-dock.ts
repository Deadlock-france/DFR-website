
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
