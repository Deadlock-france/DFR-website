"use client";

import { useState } from "react";

import { deleteOwnAccountAction } from "@/app/profil/actions";
import { Button } from "@/components/shadcn/button";

export default function DeleteAccountSection({
  deleteError,
}: {
  deleteError?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section
      className="rounded-2xl border p-6 sm:p-8"
      style={{
        borderColor: "rgba(234, 60, 63, 0.28)",
        backgroundColor: "rgba(234, 60, 63, 0.06)",
      }}
    >
      <h2 className="text-base font-semibold text-foreground">
        Supprimer mon compte
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Ton compte Discord sur ce site est effacé (profil, équipes, chat). Les
        archives de showmatch gardent le pseudo affiché au moment des matchs :
        il ne permet pas de te relier à un compte. Les identifiants Discord et
        Steam sont retirés.
      </p>

      {deleteError ? (
        <p className="mt-3 text-sm text-destructive">
          La suppression a échoué. Réessaie dans un instant.
        </p>
      ) : null}

      {confirming ? (
        <form action={deleteOwnAccountAction} className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" variant="destructive">
            Confirmer la suppression
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(false)}
          >
            Annuler
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          onClick={() => setConfirming(true)}
        >
          Supprimer mon compte
        </Button>
      )}
    </section>
  );
}
