"use client";

import { useEffect, useState } from "react";

import HeroPrefsSection from "@/components/account/HeroPrefsSection";
import DebanSection from "@/components/account/DebanSection";
import ShowmatchHistorySection from "@/components/account/ShowmatchHistorySection";
import FadeIn from "@/components/motion/FadeIn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { buttonVariants } from "@/components/shadcn/button";
import {
  readStoredProfilPayload,
  subscribeAccountInvalidation,
  writeStoredProfilPayload,
} from "@/lib/account/client-cache";
import type {
  Profile,
  ProfileHeroPref,
  ShowmatchHistoryEntry,
  ShowmatchPlayerRef,
} from "@/lib/account/types";
import type { DebanRequest, DiscordBan } from "@/lib/admin/deban-types";
import type { DeadlockHero } from "@/lib/deadlock/types";
import { cn } from "@/lib/utils";
import { ensureBrowserSession } from "@/lib/account/session-bootstrap";

type ProfilPayload = {
  id: string;
  profile: Profile | null;
  displayLabel?: string;
  prefs?: ProfileHeroPref[];
  heroes?: Array<Pick<DeadlockHero, "id" | "name" | "images">>;
  showmatchPlayer?: ShowmatchPlayerRef | null;
  showmatchHistory?: ShowmatchHistoryEntry[];
  activeBan?: DiscordBan | null;
  pendingDeban?: DebanRequest | null;
  debanRequests?: DebanRequest[];
};

type FlashParams = {
  heroes?: string;
  error?: string;
  claim?: string;
  claimError?: string;
  deban?: string;
};

let cachedPayload: ProfilPayload | null | undefined;
let inflight: Promise<ProfilPayload | null> | null = null;

function hydrateFromSession(): ProfilPayload | null | undefined {
  if (cachedPayload !== undefined) return cachedPayload;
  const stored = readStoredProfilPayload<ProfilPayload>();
  if (stored !== undefined) cachedPayload = stored;
  return cachedPayload;
}

async function revalidateProfil(): Promise<ProfilPayload | null> {
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
        writeStoredProfilPayload(null);
        return null;
      }
      const data = (await response.json()) as { user: ProfilPayload | null };
      cachedPayload = data.user;
      writeStoredProfilPayload(cachedPayload);
      return cachedPayload;
    } catch {
      return cachedPayload ?? null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

async function loadProfil(force = false): Promise<ProfilPayload | null> {
  if (!force) {
    const hydrated = hydrateFromSession();
    if (hydrated !== undefined) {
      void revalidateProfil();
      return hydrated;
    }
  }
  return revalidateProfil();
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
    const debanFlash = params.get("deban") ?? undefined;
    setFlash({
      heroes: heroesFlash,
      error: errorFlash,
      claim,
      claimError,
      deban: debanFlash,
    });

    const mustRefresh =
      heroesFlash === "1" ||
      errorFlash === "heroes" ||
      errorFlash === "hero_dup" ||
      claim === "1" ||
      Boolean(claimError) ||
      debanFlash === "1" ||
      Boolean(errorFlash?.startsWith("deban")) ||
      errorFlash === "invalid_message" ||
      errorFlash === "pending_exists";

    if (mustRefresh) {
      cachedPayload = undefined;
      writeStoredProfilPayload(undefined);
      void loadProfil(true).then(setPayload);
    }

    if (
      params.has("invite") ||
      params.has("invited") ||
      params.has("claim") ||
      params.has("claim_error") ||
      params.has("saved") ||
      params.has("heroes") ||
      params.has("error") ||
      params.has("deban")
    ) {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      url.searchParams.delete("invited");
      url.searchParams.delete("claim");
      url.searchParams.delete("claim_error");
      url.searchParams.delete("saved");
      url.searchParams.delete("heroes");
      url.searchParams.delete("error");
      url.searchParams.delete("deban");
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

    const hydrated = hydrateFromSession();
    if (hydrated !== undefined) setPayload(hydrated);

    void loadProfil().then((next) => {
      if (!cancelled) setPayload(next);
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

  const flashMessage = flash.heroes ? "Héros préférés enregistrés." : null;

  const errorMessage =
    flash.error === "heroes" || flash.error === "hero_dup"
      ? "Impossible d'enregistrer les héros (doublons ?)."
      : null;

  const debanError =
    flash.error === "invalid_message" ||
    flash.error === "pending_exists" ||
    flash.error === "deban_no_ban" ||
    flash.error === "deban_no_discord" ||
    flash.error === "deban_save_failed"
      ? flash.error
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

      <FadeIn delay={0.11} className="mt-10">
        <DebanSection
          ban={payload.activeBan ?? null}
          pendingRequest={payload.pendingDeban ?? null}
          recentRequests={payload.debanRequests ?? []}
          flashOk={flash.deban === "1"}
          flashError={debanError}
        />
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
