"use client";

import { useEffect, useState } from "react";

import HeroPrefsSection from "@/components/account/HeroPrefsSection";
import ShowmatchHistorySection from "@/components/account/ShowmatchHistorySection";
import FadeIn from "@/components/motion/FadeIn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { buttonVariants } from "@/components/shadcn/button";
import { subscribeAccountInvalidation } from "@/lib/account/client-cache";
import type {
  Profile,
  ProfileHeroPref,
  ShowmatchHistoryEntry,
  ShowmatchPlayerRef,
} from "@/lib/account/types";
import type { DeadlockHero } from "@/lib/deadlock/types";
import { cn } from "@/lib/utils";
import { ensureBrowserSession } from "@/lib/account/session-bootstrap";

type ProfilPayload = {
  id: string;
  profile: Profile | null;
  displayLabel?: string;
  prefs?: ProfileHeroPref[];
  heroes?: DeadlockHero[];
  showmatchPlayer?: ShowmatchPlayerRef | null;
  showmatchHistory?: ShowmatchHistoryEntry[];
};

type FlashParams = {
  heroes?: string;
  error?: string;
  claim?: string;
  claimError?: string;
};

let cachedPayload: ProfilPayload | null | undefined;
let inflight: Promise<ProfilPayload | null> | null = null;

async function loadProfil(force = false): Promise<ProfilPayload | null> {
  if (!force && cachedPayload !== undefined) return cachedPayload;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      await ensureBrowserSession();
      const response = await fetch("/api/account/profil", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        cachedPayload = null;
        return null;
      }
      const data = (await response.json()) as { user: ProfilPayload | null };
      cachedPayload = data.user;
      return cachedPayload;
    } catch {
      cachedPayload = null;
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export default function ProfilPageClient() {
  const [payload, setPayload] = useState<ProfilPayload | null | undefined>(
    () => cachedPayload,
  );
  const [flash, setFlash] = useState<FlashParams>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const claim = params.get("claim") ?? undefined;
    const claimError = params.get("claim_error") ?? undefined;
    const heroesFlash = params.get("heroes") ?? undefined;
    const errorFlash = params.get("error") ?? undefined;
    setFlash({
      heroes: heroesFlash,
      error: errorFlash,
      claim,
      claimError,
    });

    // Après save héros / claim : invalider le cache module sinon l'UI reste stale.
    if (
      heroesFlash === "1" ||
      errorFlash === "heroes" ||
      errorFlash === "hero_dup" ||
      claim === "1" ||
      claimError
    ) {
      cachedPayload = undefined;
      void loadProfil(true).then(setPayload);
    }

    if (
      params.has("invite") ||
      params.has("invited") ||
      params.has("claim") ||
      params.has("claim_error") ||
      params.has("saved") ||
      params.has("heroes") ||
      params.has("error")
    ) {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      url.searchParams.delete("invited");
      url.searchParams.delete("claim");
      url.searchParams.delete("claim_error");
      url.searchParams.delete("saved");
      url.searchParams.delete("heroes");
      url.searchParams.delete("error");
      const qs = url.searchParams.toString();
      window.history.replaceState(
        {},
        "",
        qs ? `${url.pathname}?${qs}` : url.pathname,
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadProfil().then((next) => {
      if (cancelled) return;
      setPayload(next);
    });

    const unsubscribe = subscribeAccountInvalidation(() => {
      cachedPayload = undefined;
      void loadProfil(true).then((next) => {
        if (!cancelled) setPayload(next);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (payload === undefined) {
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        Chargement du profil…
      </p>
    );
  }

  if (!payload) {
    return (
      <div className="mt-8 rounded-2xl border p-6" style={{ borderColor: "#1f2937" }}>
        <p className="text-sm text-muted-foreground">
          Connecte-toi avec Discord pour voir ton profil.
        </p>
        <a
          href="/auth/login?next=/profil"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "mt-4 inline-flex rounded-xl font-semibold no-underline",
          )}
          style={{
            backgroundColor: "#5865F2",
            borderColor: "transparent",
            color: "white",
          }}
        >
          Se connecter
        </a>
      </div>
    );
  }

  if (!payload.profile) {
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        Ton compte Discord est connecté, mais le profil n&apos;est pas encore
        disponible. Recharge la page dans quelques secondes.
      </p>
    );
  }

  const profile = payload.profile;
  const prefs = payload.prefs ?? [];
  const heroes = payload.heroes ?? [];
  const label = payload.displayLabel ?? "Joueur";
  const initials = label.slice(0, 2).toUpperCase();

  const flashMessage = flash.heroes
    ? "Héros préférés enregistrés."
    : null;

  const errorMessage =
    flash.error === "heroes" || flash.error === "hero_dup"
      ? "Impossible d'enregistrer les héros (doublons ?)."
      : null;

  return (
    <>
      {flashMessage ? (
        <p
          className="mt-6 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: "rgba(74, 155, 127, 0.35)",
            backgroundColor: "rgba(74, 155, 127, 0.1)",
            color: "#6BB89A",
          }}
        >
          {flashMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="mt-6 rounded-xl border px-3 py-2 text-sm text-destructive"
          style={{ borderColor: "rgba(234, 60, 63, 0.35)" }}
        >
          {errorMessage}
        </p>
      ) : null}

      <FadeIn delay={0.06} className="mt-8">
        <div
          className="rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor: "#1f2937",
            backgroundColor: "rgba(74, 155, 127, 0.06)",
          }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar size="lg" className="size-16 rounded-2xl">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="" />
              ) : null}
              <AvatarFallback className="rounded-2xl text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="text-xl font-semibold tracking-[-0.01em] text-foreground">
                {label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                @{profile.username ?? "discord"}
                {profile.global_name && profile.global_name !== label
                  ? ` · ${profile.global_name}`
                  : null}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Identité Discord (lecture seule).
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1} className="mt-10">
        <HeroPrefsSection heroes={heroes} prefs={prefs} />
      </FadeIn>

      <FadeIn delay={0.12} className="mt-10">
        <ShowmatchHistorySection
          entries={payload.showmatchHistory ?? []}
          showmatchNickname={profile.showmatch_nickname ?? ""}
          claimOk={flash.claim === "1"}
          claimError={flash.claimError ?? null}
        />
      </FadeIn>
    </>
  );
}
