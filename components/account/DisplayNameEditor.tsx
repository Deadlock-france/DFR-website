"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

import { updateDisplayNameAction } from "@/app/profil/actions";
import { buttonVariants } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

export default function DisplayNameEditor({
  currentValue,
  placeholder,
}: {
  currentValue: string;
  placeholder: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pseudo affiché
          </p>
          <p className="mt-1 text-sm text-foreground">
            {currentValue.trim() || (
              <span className="text-muted-foreground">Non défini</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-xl",
          )}
        >
          <Pencil className="size-3.5" />
          Modifier
        </button>
      </div>
    );
  }

  return (
    <form action={updateDisplayNameAction} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="display_name" className="text-sm font-medium">
          Pseudo affiché sur le site
        </label>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[color:var(--nav-hover)] hover:text-foreground"
          aria-label="Annuler"
        >
          <X className="size-4" />
        </button>
      </div>
      <input
        id="display_name"
        name="display_name"
        defaultValue={currentValue}
        maxLength={40}
        placeholder={placeholder}
        autoFocus
        className="h-10 rounded-xl border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ borderColor: "#1f2937" }}
      />
      <button
        type="submit"
        className={cn(
          buttonVariants({ size: "lg" }),
          "w-fit border-0 font-semibold text-white",
        )}
        style={{ backgroundColor: "#4A9B7F" }}
      >
        Enregistrer
      </button>
    </form>
  );
}
