import { createServiceRoleClient } from "@/lib/supabase/admin";

export type CachedDeeplTranslation = {
  gid: string;
  appid: number;
  source_title: string;
  source_contents: string;
  title_fr: string;
  contents_fr: string;
};

function hasServiceRoleEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/**
 * Lecture / écriture du cache DeepL. Dégradation douce si Supabase
 * n'est pas configuré (CI, build sans secrets).
 */
function tryCreateAdminClient() {
  if (!hasServiceRoleEnv()) {
    return null;
  }

  try {
    return createServiceRoleClient();
  } catch (error) {
    console.error("patch_note_translations: admin client unavailable:", error);
    return null;
  }
}

export async function getCachedDeeplTranslation(
  gid: string,
): Promise<CachedDeeplTranslation | null> {
  const supabase = tryCreateAdminClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("patch_note_translations")
      .select("gid, appid, source_title, source_contents, title_fr, contents_fr")
      .eq("gid", gid)
      .maybeSingle();

    if (error) {
      console.error(
        `patch_note_translations read failed for gid=${gid}:`,
        error.message,
      );
      return null;
    }

    return data;
  } catch (error) {
    console.error(`patch_note_translations read failed for gid=${gid}:`, error);
    return null;
  }
}

export async function saveDeeplTranslation(input: {
  gid: string;
  appid: number;
  source_title: string;
  source_contents: string;
  title_fr: string;
  contents_fr: string;
}): Promise<void> {
  const supabase = tryCreateAdminClient();
  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase.from("patch_note_translations").upsert(
      {
        gid: input.gid,
        appid: input.appid,
        source_title: input.source_title,
        source_contents: input.source_contents,
        title_fr: input.title_fr,
        contents_fr: input.contents_fr,
        translation_source: "deepl",
      },
      { onConflict: "gid" },
    );

    if (error) {
      console.error(
        `patch_note_translations upsert failed for gid=${input.gid}:`,
        error.message,
      );
    }
  } catch (error) {
    console.error(
      `patch_note_translations upsert failed for gid=${input.gid}:`,
      error,
    );
  }
}

export function isCachedTranslationFresh(
  cached: CachedDeeplTranslation,
  original: { title: string; contents: string },
): boolean {
  return (
    cached.source_title === original.title &&
    cached.source_contents === original.contents
  );
}
