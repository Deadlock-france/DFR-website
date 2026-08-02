"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import {
  DEADLOCK_LANG_ENGLISH,
  DEADLOCK_LANG_FRENCH,
  type DeadlockLanguage,
} from "@/lib/deadlock/types";

export default function ReferenceLanguageSwitch({
  value,
  englishAvailable,
  onChange,
}: {
  value: DeadlockLanguage;
  englishAvailable: boolean;
  onChange: (language: DeadlockLanguage) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Langue de la patch note et des noms détectés (héros, objets, capacités)
      </p>

      <Tabs
        value={value}
        onValueChange={(nextValue) => {
          if (
            nextValue === DEADLOCK_LANG_FRENCH ||
            nextValue === DEADLOCK_LANG_ENGLISH
          ) {
            onChange(nextValue);
          }
        }}
      >
        <TabsList aria-label="Langue de la patch note">
          <TabsTrigger value={DEADLOCK_LANG_FRENCH}>Français</TabsTrigger>
          <TabsTrigger
            value={DEADLOCK_LANG_ENGLISH}
            disabled={!englishAvailable}
          >
            Anglais (VO)
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
