"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
      className="mx-auto flex w-full max-w-md flex-col gap-4 border border-[#2a3538] bg-[#0c1214] px-5 py-6"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[#8a9b9f]">
          Élévation admin
        </p>
        <h1 className="mt-2 font-colus text-2xl tracking-wide text-foreground">
          Second facteur
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connecté en tant que {displayLabel}. Entre le secret admin (hors
          Discord) pour continuer.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Secret admin</span>
        <input
          type="password"
          name="secret"
          autoComplete="current-password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="border border-[#2a3538] bg-[#12181a] px-3 py-2 text-foreground outline-none focus:border-[#58a484]"
          required
        />
      </label>

      {error ? (
        <p className="text-sm text-[#e07070]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-[#4A9B7F] px-4 py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-105 disabled:opacity-60"
      >
        {pending ? "Vérification…" : "Déverrouiller"}
      </button>
    </form>
  );
}
