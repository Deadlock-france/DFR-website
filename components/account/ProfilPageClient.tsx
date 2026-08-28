"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

import DeleteAccountSection from "@/components/account/DeleteAccountSection";
import HeroPrefsSection from "@/components/account/HeroPrefsSection";
import ProfileRankCard from "@/components/account/ProfileRankCard";
import ShowmatchBadges from "@/components/account/ShowmatchBadges";
import ShowmatchHistorySection from "@/components/account/ShowmatchHistorySection";
import FadeIn from "@/components/motion/FadeIn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { buttonVariants } from "@/components/shadcn/button";
import {
  readStoredProfilPayload,
  subscribeAccountInvalidation,
  invalidateAccountClientCaches,
  writeStoredProfilPayload,
} from "@/lib/account/client-cache";
import type {
  PlayerRankSnapshot,
  Profile,
  ProfileHeroPref,
  ShowmatchBadge,
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
  heroes?: Array<Pick<DeadlockHero, "id" | "name" | "images">>;
  showmatchPlayer?: ShowmatchPlayerRef | null;
  showmatchHistory?: ShowmatchHistoryEntry[];
  showmatchBadges?: ShowmatchBadge[];
  rank?: PlayerRankSnapshot;
};

type FlashParams = {
  heroes?: string;
  error?: string;
  claim?: string;
  claimError?: string;
};

let cachedPayload: ProfilPayload | null | undefined;
let inflight: Promise<ProfilPayload | null> | null = null;
let rankInflight: Promise<PlayerRankSnapshot | null> | null = null;
let autoRankAttempted = false;

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

async function postRank(force: boolean): Promise<PlayerRankSnapshot | null> {
  if (rankInflight) return rankInflight;

  rankInflight = (async () => {
    try {
      await ensureBrowserSession();
      const response = await fetch("/api/account/rank", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = (await response.json()) as {
        rank?: PlayerRankSnapshot;
      };
      return data.rank ?? null;
    } catch {
      return null;
    } finally {
      rankInflight = null;
    }
  })();

  return rankInflight;
}

function identityMeta(profile: Profile, label: string): string {
  const parts = [`@${profile.username ?? "discord"}`];
  if (profile.global_name && profile.global_name !== label) {
    parts.push(profile.global_name);
  }
  if (profile.showmatch_nickname) {
    parts.push(profile.showmatch_nickname);
  }
  return parts.join(" · ");
}

export default function ProfilPageClient() {
  const [payload, setPayload] = useState<ProfilPayload | null | undefined>(
    () => cachedPayload,
  );
  const [flash, setFlash] = useState<FlashParams>({});
  const [rankLoading, setRankLoading] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);

  const applyRank = (rank: PlayerRankSnapshot) => {
    setPayload((prev) => {
      if (!prev) return prev;
      const next = { ...prev, rank };
      cachedPayload = next;
      writeStoredProfilPayload(next);
      return next;
    });
  };

  const refreshRank = (force: boolean) => {
    setRankError(null);
    setRankLoading(true);
    void postRank(force).then((next) => {
      setRankLoading(false);
      if (next) {
        applyRank(next);
        return;
      }
      setRankError("Impossible de charger le rang.");
    });
  };

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

    const mustRefresh =
      heroesFlash === "1" ||
      errorFlash === "heroes" ||
      errorFlash === "hero_dup" ||
      claim === "1" ||
      Boolean(claimError);

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

    const hydrated = hydrateFromSession();
    if (hydrated !== undefined) setPayload(hydrated);

    void loadProfil().then((next) => {
      if (!cancelled) setPayload(next);
    });

    const unsubscribe = subscribeAccountInvalidation(() => {
      cachedPayload = undefined;
      autoRankAttempted = false;
      void loadProfil(true).then((next) => {
        if (!cancelled) setPayload(next);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!payload?.rank?.hasSteam || payload.rank.fetchedAt) return;
    if (autoRankAttempted) return;
    autoRankAttempted = true;
    refreshRank(false);
    // Premier fetch seulement : `autoRankAttempted` évite un second POST.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshRank est volontairement instable
  }, [payload?.rank?.hasSteam, payload?.rank?.fetchedAt]);

  if (payload === undefined) {
    return (
      <p className="text-sm text-muted-foreground">Chargement du profil…</p>
    );
  }

  if (!payload) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h1 className="font-colus text-2xl tracking-[-0.02em] text-foreground sm:text-3xl">
            Mon profil
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connecte-toi avec Discord pour voir ton profil.
          </p>
        </div>
        <a
          href="/auth/login?next=/profil"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-11 shrink-0 rounded-xl font-semibold text-white no-underline",
          )}
          style={{
            backgroundColor: "#5865F2",
            borderColor: "transparent",
          }}
        >
          Se connecter
        </a>
      </div>
    );
  }

  if (!payload.profile) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h1 className="font-colus text-2xl tracking-[-0.02em] text-foreground">
          Mon profil
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ton compte Discord est connecté, mais le profil n&apos;est pas encore
          disponible. Recharge la page dans quelques secondes.
        </p>
      </div>
    );
  }

  const profile = payload.profile;
  const prefs = payload.prefs ?? [];
  const heroes = payload.heroes ?? [];
  const label = payload.displayLabel ?? "Joueur";
  const initials = label.slice(0, 2).toUpperCase();

  const flashMessage = flash.heroes ? "Héros préférés enregistrés." : null;

  const heroError =
    flash.error === "heroes" || flash.error === "hero_dup"
      ? "Impossible d'enregistrer les héros (doublons ?)."
      : null;

  const badges = payload.showmatchBadges ?? [];

  return (
    <FadeIn className="flex flex-col gap-4 lg:gap-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {flashMessage ? (
          <p className="border-b border-primary/35 bg-primary/10 px-4 py-2 text-sm text-primary sm:px-5">
            {flashMessage}
          </p>
        ) : null}

        {heroError ? (
          <p className="border-b border-destructive/35 px-4 py-2 text-sm text-destructive sm:px-5">
            {heroError}
          </p>
        ) : null}

        {rankError ? (
          <p className="border-b border-destructive/35 px-4 py-2 text-sm text-destructive sm:px-5">
            {rankError}
          </p>
        ) : null}

        <div className="flex items-stretch">
          <div className="relative shrink-0 border-r border-border bg-[linear-gradient(165deg,color-mix(in_srgb,var(--primary)_16%,transparent),var(--background)_60%)] px-3 py-4 sm:px-5 sm:py-5">
            <Avatar className="size-24 rounded-lg after:rounded-lg sm:size-32">
              {profile.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={label}
                  className="rounded-lg"
                />
              ) : null}
              <AvatarFallback className="rounded-lg text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-colus truncate text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
                  {label}
                </h1>
                {payload.rank?.hasSteam ? (
                  <ProfileRankCard
                    rank={payload.rank}
                    loading={rankLoading}
                    onRefresh={() => refreshRank(true)}
                    className="mt-0.5"
                  />
                ) : null}
                <p className="truncate text-sm text-muted-foreground">
                  {identityMeta(profile, label)}
                </p>
              </div>
              <a
                href="/auth/logout"
                aria-label="Déconnexion"
                onClick={() => invalidateAccountClientCaches()}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-11 w-fit shrink-0 rounded-xl px-3 no-underline",
                )}
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </a>
            </div>
            {badges.length > 0 ? (
              <ShowmatchBadges badges={badges} />
            ) : null}
          </div>
        </div>
      </section>

      <HeroPrefsSection heroes={heroes} prefs={prefs} />

      <ShowmatchHistorySection
        entries={payload.showmatchHistory ?? []}
        showmatchNickname={profile.showmatch_nickname ?? ""}
        claimOk={flash.claim === "1"}
        claimError={flash.claimError ?? null}
      />

      <DeleteAccountSection deleteError={flash.error === "delete_account"} />
    </FadeIn>
  );
}
