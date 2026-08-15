"use client";

import { submitDebanRequestAction } from "@/lib/admin/deban-actions";
import {
  debanStatusLabel,
  type DebanRequest,
  type DiscordBan,
} from "@/lib/admin/deban-types";

function formatDt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export default function DebanSection({
  ban,
  pendingRequest,
  recentRequests,
  flashOk,
  flashError,
}: {
  ban: DiscordBan | null;
  pendingRequest: DebanRequest | null;
  recentRequests: DebanRequest[];
  flashOk?: boolean;
  flashError?: string | null;
}) {
  if (!ban && recentRequests.length === 0) return null;

  const errorLabel =
    flashError === "invalid_message"
      ? "Message : entre 20 et 4000 caractères."
      : flashError === "pending_exists"
        ? "Tu as déjà une demande en attente."
        : flashError === "deban_no_ban"
          ? "Aucun ban actif."
          : flashError === "deban_no_discord"
            ? "Identité Discord manquante."
            : flashError === "deban_save_failed"
              ? "Envoi impossible."
              : flashError
                ? "Action impossible."
                : null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-colus text-2xl tracking-wide">Serveur Discord</h2>

      {flashOk ? (
        <p className="border border-[#4A9B7F]/40 bg-[#4A9B7F]/10 px-3 py-2 text-sm text-[#9fd4bc]">
          Demande de déban envoyée.
        </p>
      ) : null}
      {errorLabel ? (
        <p className="border border-[#e07070]/40 bg-[#e07070]/10 px-3 py-2 text-sm text-[#e07070]">
          {errorLabel}
        </p>
      ) : null}

      {ban ? (
        <div className="border border-[#e07070]/35 bg-[#e07070]/08 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#e07070]">
            Ban actif
          </p>
          <p className="mt-2 text-sm text-foreground/90">
            Motif : {ban.reason || "Non précisé"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Depuis le {formatDt(ban.banned_at)}
            {ban.banned_by_label ? ` · ${ban.banned_by_label}` : ""}
          </p>

          {pendingRequest ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Demande en attente envoyée le {formatDt(pendingRequest.created_at)}.
            </p>
          ) : (
            <form
              action={submitDebanRequestAction}
              className="mt-4 flex flex-col gap-3"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">
                  Demande de déban
                </span>
                <textarea
                  name="message"
                  required
                  minLength={20}
                  maxLength={4000}
                  rows={5}
                  placeholder="Explique pourquoi tu demandes un déban…"
                  className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="cursor-pointer self-start bg-[#4A9B7F] px-4 py-2 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
              >
                Envoyer la demande
              </button>
            </form>
          )}
        </div>
      ) : null}

      {recentRequests.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {recentRequests.map((req) => (
            <li
              key={req.id}
              className="border border-[#2a3538] bg-[#0c1214] px-4 py-3 text-sm"
            >
              <p className="text-muted-foreground">
                {debanStatusLabel(req.status)} · {formatDt(req.created_at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-foreground/85">
                {req.message}
              </p>
              {req.admin_note && req.status !== "pending" ? (
                <p className="mt-2 text-muted-foreground">
                  Réponse staff : {req.admin_note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
