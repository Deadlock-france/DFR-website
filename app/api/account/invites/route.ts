import { NextResponse } from "next/server";

import {
  getCurrentUserId,
  getPendingInvitesForUser,
} from "@/lib/account/queries";

/** Endpoint léger pour le polling / refresh des invitations. */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ userId: null, invites: [] });
    }

    const invites = await getPendingInvitesForUser(userId);
    return NextResponse.json({ userId, invites });
  } catch (error) {
    console.error("GET /api/account/invites failed:", error);
    return NextResponse.json({ userId: null, invites: [] }, { status: 200 });
  }
}
