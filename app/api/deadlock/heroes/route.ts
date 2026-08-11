import { NextResponse } from "next/server";

import { getDeadlockHeroes } from "@/lib/deadlock/client";

/** Catalogue héros actif — cache HTTP long (édition préférences profil). */
export async function GET() {
  try {
    const heroes = await getDeadlockHeroes({ onlyActive: true });
    return NextResponse.json(
      { heroes },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/deadlock/heroes failed:", error);
    return NextResponse.json({ heroes: [] }, { status: 200 });
  }
}
