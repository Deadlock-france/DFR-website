"use client";

import { Lock } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

export default function AdminLockButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);
  const once = useRef(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className={cn(
        "text-muted-foreground hover:text-destructive",
        className,
      )}
      onClick={async () => {
        if (once.current || pending) return;
        once.current = true;
        setPending(true);
        try {
          await fetch("/api/admin/unlock", { method: "DELETE" });
        } catch {
          // on verrouille quand même côté UI
        }
        // Navigation dure unique — évite les rafales Soft Nav / Suspense
        window.location.replace("/admin/unlock");
      }}
    >
      <Lock className="size-3.5" strokeWidth={1.75} />
      {pending ? "Verrouillage…" : "Sortir du mode admin"}
    </Button>
  );
}
