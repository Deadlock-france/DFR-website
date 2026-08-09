/**
 * Rangs Deadlock Ranked Mode (saison Beta 1 — MAJ 30 juil. 2026).
 *
 * Encodage Valve : `badge = tier * 10 + subrank` (ex. Sentinelle IV = 44).
 *
 * Noms FR issus de `/v1/assets/ranks?language=french`.
 * Images « hideout » (nouveaux badges) via
 * `/v1/assets/ranks/{tier}/{subrank}/image` — pas les anciens `badge_sm_*`.
 */

import { DEADLOCK_ASSETS_API } from "@/lib/deadlock/types";

export const DEADLOCK_RANKS_IMAGE_BASE =
  "https://assets-bucket.deadlock-api.com/assets-api-res/images/ranks";

/** Noms affichés (FR) + métadonnées API. */
export const DEADLOCK_RANK_TIERS = [
  {
    tier: 0,
    name: "Obscurus",
    nameEn: "Obscurus",
    material: null,
    color: "#333333",
  },
  {
    tier: 1,
    name: "Prosélyte",
    nameEn: "Initiate",
    material: "Brick",
    color: "#6A3E1E",
  },
  {
    tier: 2,
    name: "Adepte",
    nameEn: "Seeker",
    material: "Stone",
    color: "#882355",
  },
  {
    tier: 3,
    name: "Acolyte",
    nameEn: "Acolyte",
    material: "Iron",
    color: "#5C6DAB",
  },
  {
    tier: 4,
    name: "Sentinelle",
    nameEn: "Sentinel",
    material: "Bronze",
    color: "#719C47",
  },
  {
    tier: 5,
    name: "Mystique",
    nameEn: "Mystic",
    material: "Silver",
    color: "#DDA326",
  },
  {
    tier: 6,
    name: "Ritualiste",
    nameEn: "Ritualist",
    material: "Gold",
    color: "#EE4F57",
  },
  {
    tier: 7,
    name: "Émissaire",
    nameEn: "Emissary",
    material: "Platinum",
    color: "#B47FEB",
  },
  {
    tier: 8,
    name: "Oracle",
    nameEn: "Oracle",
    material: "Diamond",
    color: "#955138",
  },
  {
    tier: 9,
    name: "Augure",
    nameEn: "Phantom",
    material: null,
    color: "#7C7C7C",
  },
  {
    tier: 10,
    name: "Thaumaturge",
    nameEn: "Ascendant",
    material: null,
    color: "#C39751",
  },
  {
    tier: 11,
    name: "Éternus",
    nameEn: "Eternus",
    material: null,
    color: "#5CE9A9",
  },
] as const;

export type DeadlockRankTier = (typeof DEADLOCK_RANK_TIERS)[number];

const SUBRANK_ROMAN = ["I", "II", "III", "IV", "V", "VI"] as const;

export type DeadlockSubrank = 1 | 2 | 3 | 4 | 5 | 6;

export type DeadlockRankInfo = {
  tier: number;
  name: string;
  nameEn: string;
  color: string;
  /** null si Obscurus / non classé */
  subrank: DeadlockSubrank | null;
  /** Badge Valve arrondi (tier*10+sub), null si Obscurus */
  badge: number | null;
  /** Libellé affiché, ex. "Émissaire IV" */
  label: string;
  /** Nouveau badge Ranked (portrait) */
  imageUrl: string;
  imageUrlLarge: string;
};

function clampTier(tier: number): number {
  if (!Number.isFinite(tier) || tier <= 0) return 0;
  return Math.min(11, Math.max(0, Math.trunc(tier)));
}

function clampSubrank(sub: number): DeadlockSubrank {
  if (!Number.isFinite(sub)) return 1;
  return Math.min(6, Math.max(1, Math.round(sub))) as DeadlockSubrank;
}

function tierMeta(tier: number): DeadlockRankTier {
  return DEADLOCK_RANK_TIERS[clampTier(tier)] ?? DEADLOCK_RANK_TIERS[0];
}

function formatLabel(name: string, subrank: DeadlockSubrank | null): string {
  if (subrank == null) return name;
  return `${name} ${SUBRANK_ROMAN[subrank - 1]}`;
}

/**
 * URL du badge Ranked Mode (nouveaux visuels hideout).
 * Obscurus n’a pas d’endpoint dynamique → asset large CDN.
 */
export function rankBadgeImageUrl(
  tier: number,
  subrank: DeadlockSubrank | null,
): string {
  const t = clampTier(tier);

  if (t === 0) {
    return `${DEADLOCK_RANKS_IMAGE_BASE}/rank00_lg.webp`;
  }

  const sub = subrank ?? 1;
  return `${DEADLOCK_ASSETS_API}/ranks/${t}/${sub}/image?format=webp`;
}

function buildRankInfo(
  tier: number,
  subrank: DeadlockSubrank | null,
  badge: number | null,
): DeadlockRankInfo {
  const meta = tierMeta(tier);
  const effectiveSub = tier === 0 ? null : subrank;
  const imageUrl = rankBadgeImageUrl(meta.tier, effectiveSub);

  return {
    tier: meta.tier,
    name: meta.name,
    nameEn: meta.nameEn,
    color: meta.color,
    subrank: effectiveSub,
    badge: tier === 0 ? null : badge,
    label: formatLabel(meta.name, effectiveSub),
    imageUrl,
    imageUrlLarge: imageUrl,
  };
}

/**
 * Décode un badge Valve entier (11–116) ou 0 (Obscurus).
 */
export function rankFromBadge(badge: number): DeadlockRankInfo {
  if (!Number.isFinite(badge) || badge <= 0) {
    return buildRankInfo(0, null, null);
  }

  const rounded = Math.round(badge);
  const tier = clampTier(Math.floor(rounded / 10));
  const rawSub = rounded % 10;

  if (tier === 0) {
    return buildRankInfo(0, null, null);
  }

  const subrank = clampSubrank(rawSub === 0 ? 1 : rawSub);
  return buildRankInfo(tier, subrank, tier * 10 + subrank);
}

/**
 * Interprète une note / moyenne showmatch :
 * - `>= 11` → badge Valve (tier*10+sub)
 * - `0 < score < 11` → tier seul (sous-rang dérivé de la partie décimale si présente)
 * - `<= 0` → Obscurus
 */
export function rankFromScore(score: number): DeadlockRankInfo {
  if (!Number.isFinite(score) || score <= 0) {
    return rankFromBadge(0);
  }

  if (score >= 11) {
    return rankFromBadge(score);
  }

  const tier = clampTier(Math.floor(score));
  if (tier === 0) {
    return rankFromBadge(0);
  }

  const frac = score - Math.floor(score);
  const subrank =
    frac > 0
      ? clampSubrank(Math.max(1, Math.ceil(frac * 6)))
      : (1 as DeadlockSubrank);

  return buildRankInfo(tier, subrank, tier * 10 + subrank);
}

/** Libellé grade seul (ex. "Mystique III"). */
export function formatRankLabel(score: number): string {
  return rankFromScore(score).label;
}

/**
 * Grade + note compacte pour l’UI showmatch.
 * Ex. "Émissaire IV (73.5)" — si Obscurus / 0 → "Obscurus".
 */
export function formatRankWithScore(score: number): string {
  if (!Number.isFinite(score) || score <= 0) {
    return "Obscurus";
  }
  const { label } = rankFromScore(score);
  const note = Number.isInteger(score) ? String(score) : score.toFixed(1);
  return `${label} (${note})`;
}
