"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

export default function AccesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/site-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password, next }),
      });

      if (!response.ok) {
        setError("Mot de passe incorrect.");
        setPending(false);
        return;
      }

      const data = (await response.json()) as { next?: string };
      router.replace(data.next?.startsWith("/") ? data.next : next);
      router.refresh();
    } catch {
      setError("Impossible de vérifier le mot de passe.");
      setPending(false);
    }
  }

  return (
    <main
      className="flex min-h-dvh items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-default)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 sm:p-8"
        style={{
          borderColor: "#1f2937",
          backgroundColor: "rgba(74, 155, 127, 0.06)",
        }}
      >
        <p className="font-colus text-2xl tracking-[-0.02em] text-foreground">
          Deadlock France
        </p>
        <h1 className="mt-3 text-lg font-semibold text-foreground">
          Accès anticipé
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le site n&apos;est pas encore public. Entre le mot de passe pour
          continuer.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <label htmlFor="site-password" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="site-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-xl border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ borderColor: "#1f2937" }}
          />

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending || password.length === 0}
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-2 w-full border-0 font-semibold text-white disabled:opacity-60",
            )}
            style={{ backgroundColor: "#4A9B7F" }}
          >
            {pending ? "Vérification…" : "Entrer"}
          </button>
        </form>
      </div>
    </main>
  );
}
