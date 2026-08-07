import { cacheLife, cacheTag } from "next/cache";

import { isSupabaseConfigured } from "@/lib/supabase/env";

import { fetchShowmatchEventsFromDb } from "./from-db";
import {
  MOCK_SHOWMATCH_EVENTS,
  MOCK_SHOWMATCH_SERIES,
} from "./mock";
import type { ShowmatchEventView, ShowmatchSeriesView } from "./types";

export const SHOWMATCH_EVENTS_CACHE_TAG = "showmatch-events";

function flattenSeries(events: ShowmatchEventView[]): ShowmatchSeriesView[] {
  return events.flatMap((event) => event.series);
}

/**
 * Source de vérité : Supabase si configuré.
 * Fallback mocks uniquement si les variables publiques manquent (dev sans .env).
 * Base vide → liste vide (pas de faux résultats).
 */
export async function getShowmatchEvents(): Promise<ShowmatchEventView[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SHOWMATCH_EVENTS_CACHE_TAG);

  if (!isSupabaseConfigured()) {
    return MOCK_SHOWMATCH_EVENTS;
  }

  try {
    return await fetchShowmatchEventsFromDb();
  } catch (error) {
    console.error("[showmatch] lecture Supabase impossible", error);
    return [];
  }
}

export async function getShowmatchSeriesById(
  id: string,
): Promise<ShowmatchSeriesView | undefined> {
  const events = await getShowmatchEvents();
  return flattenSeries(events).find((series) => series.id === id);
}

export async function getShowmatchEventForSeries(
  seriesId: string,
): Promise<ShowmatchEventView | undefined> {
  const events = await getShowmatchEvents();
  return events.find((event) =>
    event.series.some((series) => series.id === seriesId),
  );
}

export async function getAllShowmatchSeriesIds(): Promise<string[]> {
  const events = await getShowmatchEvents();
  return flattenSeries(events).map((series) => series.id);
}

/** @deprecated Prefer getShowmatchSeriesById */
export async function getShowmatchMatchById(id: string) {
  return getShowmatchSeriesById(id);
}

/** @deprecated Prefer getShowmatchEventForSeries */
export async function getShowmatchEventForMatch(matchId: string) {
  return getShowmatchEventForSeries(matchId);
}

/** @deprecated Prefer getAllShowmatchSeriesIds */
export async function getAllShowmatchMatchIds(): Promise<string[]> {
  return getAllShowmatchSeriesIds();
}

/** Exposé pour tests / debug. */
export function getMockShowmatchSeries(): ShowmatchSeriesView[] {
  return MOCK_SHOWMATCH_SERIES;
}
