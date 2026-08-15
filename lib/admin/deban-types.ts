/** Types bans Discord + demandes de déban. */

export type DiscordBan = {
  id: string;
  discord_id: string;
  reason: string;
  banned_at: string;
  banned_by_label: string | null;
  source: "bot";
  active: boolean;
  lifted_at: string | null;
  lift_source: "admin_accept" | "bot" | null;
  created_at: string;
  updated_at: string;
};

export type DebanRequestStatus = "pending" | "accepted" | "rejected";

export type DebanRequest = {
  id: string;
  user_id: string;
  discord_id: string;
  ban_id: string;
  message: string;
  status: DebanRequestStatus;
  admin_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DebanRequestAdminRow = DebanRequest & {
  ban_reason: string;
  applicant_label: string | null;
};

export type BanIngestAction = "ban" | "lift";

export type BanIngestPayload = {
  action: BanIngestAction;
  discord_id: string;
  reason?: string;
  banned_at?: string;
  banned_by_label?: string;
};

export function validateBanIngestPayload(
  payload: unknown,
): { ok: true; data: BanIngestPayload } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid JSON body" };
  }
  const body = payload as Record<string, unknown>;
  const action = body.action;
  if (action !== "ban" && action !== "lift") {
    return { ok: false, error: "action must be ban or lift" };
  }
  const discordId = String(body.discord_id ?? "").trim();
  if (!/^[0-9]{5,32}$/.test(discordId)) {
    return { ok: false, error: "invalid discord_id" };
  }

  const data: BanIngestPayload = {
    action,
    discord_id: discordId,
  };

  if (typeof body.reason === "string") {
    data.reason = body.reason.trim().slice(0, 2000);
  }
  if (typeof body.banned_by_label === "string") {
    data.banned_by_label = body.banned_by_label.trim().slice(0, 120);
  }
  if (typeof body.banned_at === "string" && body.banned_at.trim()) {
    const d = new Date(body.banned_at);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "invalid banned_at" };
    }
    data.banned_at = d.toISOString();
  }

  if (action === "ban" && !(data.reason && data.reason.length > 0)) {
    return { ok: false, error: "reason required for ban" };
  }

  return { ok: true, data };
}

export function validateDebanMessage(
  message: string,
): { ok: true; message: string } | { ok: false; error: string } {
  const trimmed = message.trim();
  if (trimmed.length < 20 || trimmed.length > 4000) {
    return { ok: false, error: "invalid_message" };
  }
  return { ok: true, message: trimmed };
}

export function debanStatusLabel(status: DebanRequestStatus): string {
  switch (status) {
    case "pending":
      return "En attente";
    case "accepted":
      return "Acceptée";
    case "rejected":
      return "Refusée";
  }
}
