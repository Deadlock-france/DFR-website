import { NextResponse } from "next/server";

import {
  getCurrentUserId,
  getTeamMessages,
  getTeamWithMembers,
} from "@/lib/account/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ userId: null, team: null });
    }

    const team = await getTeamWithMembers(id);
    if (!team) {
      return NextResponse.json({ userId, team: null }, { status: 404 });
    }

    const isMember = team.members.some((m) => m.profile_id === userId);
    const isCaptain = team.captain_id === userId;
    const messages = isMember ? await getTeamMessages(id) : [];

    return NextResponse.json({
      userId,
      team,
      messages,
      isMember,
      isCaptain,
    });
  } catch (error) {
    console.error("GET /api/account/teams/[id] failed:", error);
    return NextResponse.json({ userId: null, team: null }, { status: 200 });
  }
}
