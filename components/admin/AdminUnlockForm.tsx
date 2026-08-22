"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  adminInputClassName,
  adminLabelClassName,
  adminPanelClassName,
} from "@/components/admin/admin-styles";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

export default function AdminUnlockForm({
  displayLabel,
}: {
  displayLabel: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret, next }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        next?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setError(
          data?.error === "invalid_secret"
            ? "Secret incorrect."
            : "Déverrouillage impossible.",
        );
        return;
      }
      router.replace(data.next || "/admin");
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(adminPanelClassName, "mx-auto flex w-full max-w-md flex-col gap-5 p-6 sm:p-7")}
    >
      <div>
        <p className="text-xs text-muted-foreground">Espace admin</p>
        <h1 className="font-colus mt-1 text-3xl tracking-[-0.02em] text-foreground">
          Second facteur
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Connecté en tant que {displayLabel}. Entre le secret admin (hors
          Discord) pour continuer.
        </p>
      </div>

      <label className={adminLabelClassName}>
        <span className="text-muted-foreground">Secret admin</span>
        <input
          type="password"
          name="secret"
          autoComplete="current-password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className={adminInputClassName}
          required
        />
      </label>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Vérification…" : "Déverrouiller"}
      </Button>
    </form>
  );
}
