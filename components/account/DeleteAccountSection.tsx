"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { deleteOwnAccountAction } from "@/app/profil/actions";
import { Button } from "@/components/shadcn/button";
import {
  ACCOUNT_ERASURE_CONFIRMATION,
  isAccountErasureConfirmation,
} from "@/lib/account/erasure-confirmation";

export default function DeleteAccountSection({
  deleteError,
}: {
  deleteError?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(Boolean(deleteError));
  const canSubmit = isAccountErasureConfirmation(confirmation);

  function resetConfirmation() {
    setConfirming(false);
    setConfirmation("");
  }

  return (
    <section className="border-t border-border pt-3">
      <h2 className="text-sm font-medium text-muted-foreground">Paramètres</h2>

      <details
        className="group mt-1"
        open={open}
        onToggle={(event) => {
          const next = event.currentTarget.open;
          setOpen(next);
          if (!next) resetConfirmation();
        }}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden [&::marker]:hidden">
          <ChevronRight
            aria-hidden
            className="size-3.5 shrink-0 transition-transform group-open:rotate-90"
          />
          Supprimer le compte
        </summary>

        <div className="max-w-lg pt-1 pb-1 pl-5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ton compte est effacé (profil, équipes, chat). Les archives de
            showmatch gardent le pseudo affiché au moment des matchs. Les
            identifiants Discord et Steam sont retirés.
          </p>

          {deleteError ? (
            <p className="mt-2 text-xs text-destructive">
              La suppression a échoué. Réessaie dans un instant.
            </p>
          ) : null}

          {confirming ? (
            <form action={deleteOwnAccountAction} className="mt-3 flex flex-col gap-3">
              <div>
                <label
                  htmlFor="account-erasure-confirmation"
                  className="text-xs text-muted-foreground"
                >
                  Écris{" "}
                  <span className="font-medium text-foreground">
                    {ACCOUNT_ERASURE_CONFIRMATION}
                  </span>{" "}
                  pour confirmer
                </label>
                <input
                  id="account-erasure-confirmation"
                  name="confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  placeholder={ACCOUNT_ERASURE_CONFIRMATION}
                  className="mt-1.5 h-9 w-full rounded-xl border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  className="h-11"
                  disabled={!canSubmit}
                >
                  Confirmer la suppression
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-11"
                  onClick={resetConfirmation}
                >
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-3 h-11"
              onClick={() => setConfirming(true)}
            >
              Supprimer mon compte
            </Button>
          )}
        </div>
      </details>
    </section>
  );
}
