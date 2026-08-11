"use client";

import { useMemo, useState } from "react";

import AppLink from "@/components/AppLink";
import { formatNewsDate, formatPatchNotesContent } from "@/hooks/news/format";
import { DEADLOCK_REFERENCE_LANGUAGE } from "@/lib/deadlock/config";
import type { DeadlockReferencesByLanguage } from "@/lib/deadlock/client";
import { linkReferencesInHtml, decorateReferenceChangeLines } from "@/lib/deadlock/link-content";
import {
  DEADLOCK_LANG_ENGLISH,
  type DeadlockLanguage,
} from "@/lib/deadlock/types";
import {
  getPatchNoteDisplay,
  isPatchNoteEnglishAvailable,
} from "@/lib/steam/display";
import type { SteamNewsItem } from "@/lib/steam/types";

import PatchNotesContent from "./PatchNotesContent";
import ReferenceLanguageSwitch from "./ReferenceLanguageSwitch";

export default function ArticleView({
  item,
  referencesByLanguage,
}: {
  item: SteamNewsItem;
  referencesByLanguage: DeadlockReferencesByLanguage;
}) {
  const englishAvailable = isPatchNoteEnglishAvailable(item);
  const [referenceLanguage, setReferenceLanguage] = useState<DeadlockLanguage>(
    DEADLOCK_REFERENCE_LANGUAGE,
  );

  const display = useMemo(
    () => getPatchNoteDisplay(item, referenceLanguage),
    [item, referenceLanguage],
  );

  const references = referencesByLanguage[referenceLanguage];

  const formattedHtml = useMemo(
    () => formatPatchNotesContent(display.contents),
    [display.contents],
  );

  const linkedHtml = useMemo(
    () =>
      decorateReferenceChangeLines(
        linkReferencesInHtml(formattedHtml, references),
        references,
        referenceLanguage,
      ),
    [formattedHtml, references, referenceLanguage],
  );

  return (
    <div className="mt-4 flex flex-col gap-6 p-4 sm:p-5">
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm">
        <AppLink href="/" className="text-muted-foreground hover:text-foreground">
          Accueil
        </AppLink>
        <span className="text-muted-foreground">/</span>
        <AppLink
          href="/patch-notes"
          className="text-muted-foreground hover:text-foreground"
        >
          Patch notes
        </AppLink>
        <span className="text-muted-foreground">/</span>
        <span className="max-w-300px truncate text-foreground">
          {display.title}
        </span>
      </nav>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {formatNewsDate(item.date)} · {item.author || "Valve"}
          </span>

          <h1 className="text-3xl font-bold">{display.title}</h1>
        </div>

        <ReferenceLanguageSwitch
          value={referenceLanguage}
          englishAvailable={englishAvailable}
          onChange={setReferenceLanguage}
        />

        {referenceLanguage === DEADLOCK_LANG_ENGLISH && !englishAvailable ? (
          <p className="text-sm text-muted-foreground">
            La version originale anglaise n&apos;est pas disponible pour cet
            article.
          </p>
        ) : null}

        <PatchNotesContent
          html={linkedHtml}
          references={references}
          referencesByLanguage={referencesByLanguage}
        />
      </div>
    </div>
  );
}
