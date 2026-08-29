"use client";

import { useEffect, useState } from "react";

import { submitApplicationAction } from "@/lib/admin/application-actions";
import {
  APPLICATION_TYPES,
  applicationTypeLabel,
  type ApplicationQuota,
  type ApplicationType,
} from "@/lib/admin/application-types";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_type: "Type de candidature invalide.",
  invalid_subject: "Objet : entre 3 et 120 caractères.",
  invalid_body: "Message : entre 20 et 8000 caractères.",
  pending_exists: "Tu as déjà une candidature en attente pour ce type.",
  quota_exceeded: "Limite atteinte : 3 candidatures par période de 30 jours.",
  save_failed: "Envoi impossible. Réessaie plus tard.",
};

export default function ApplicationForm({
  blockedTypes,
  quota,
  resetLabel,
}: {
  blockedTypes: ApplicationType[];
  quota: ApplicationQuota;
  resetLabel: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const available = APPLICATION_TYPES.filter((t) => !blockedTypes.includes(t));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(ERROR_MESSAGES[err] ?? "Envoi impossible.");
    if (params.get("ok") === "1") setOk(true);
  }, []);

  if (quota.remaining === 0) {
    return (
      <p className="border border-[#e07070]/40 bg-[#e07070]/10 px-3 py-2 text-sm text-[#e07070]">
        Tu as envoyé {quota.used} candidatures sur les 30 derniers jours, c’est
        la limite.
        {resetLabel ? ` Tu pourras à nouveau postuler le ${resetLabel}.` : ""}
      </p>
    );
  }

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tu as déjà une candidature en attente pour chaque type disponible.
      </p>
    );
  }

  return (
    <form action={submitApplicationAction} className="flex flex-col gap-4">
      {ok ? (
        <p className="border border-[#4A9B7F]/40 bg-[#4A9B7F]/10 px-3 py-2 text-sm text-[#9fd4bc]">
          Candidature envoyée. On te répondra ici après examen.
        </p>
      ) : null}
      {error ? (
        <p className="border border-[#e07070]/40 bg-[#e07070]/10 px-3 py-2 text-sm text-[#e07070]">
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Type</span>
        <select
          name="type"
          required
          defaultValue={available[0]}
          className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
        >
          {available.map((type) => (
            <option key={type} value={type}>
              {applicationTypeLabel(type)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Objet</span>
        <input
          name="subject"
          required
          minLength={3}
          maxLength={120}
          placeholder="Ex. Candidature modération"
          className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Message</span>
        <textarea
          name="body"
          required
          minLength={20}
          maxLength={8000}
          rows={8}
          placeholder="Présente-toi, ton expérience, ta dispo…"
          className="border border-[#2a3538] bg-[#12181a] px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="cursor-pointer self-start bg-[#4A9B7F] px-4 py-2 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
        >
          Envoyer
        </button>
        <p className="text-xs text-muted-foreground">
          Il te reste {quota.remaining} candidature
          {quota.remaining === 1 ? "" : "s"} sur {quota.limit} pour cette période
          de 30 jours.
        </p>
      </div>
    </form>
  );
}
