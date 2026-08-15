"use client";

import { useRef, useState } from "react";

export default function AdminLockButton() {
  const [pending, setPending] = useState(false);
  const once = useRef(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="cursor-pointer text-muted-foreground transition-colors hover:text-[#e07070] disabled:opacity-50"
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
      {pending ? "Verrouillage…" : "Verrouiller"}
    </button>
  );
}
