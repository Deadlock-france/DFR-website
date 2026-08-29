/** Types + helpers candidatures site. */

export const APPLICATION_TYPES = ["staff", "partner", "other"] as const;
export type ApplicationType = (typeof APPLICATION_TYPES)[number];

export const APPLICATION_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type SiteApplication = {
  id: string;
  user_id: string;
  type: ApplicationType;
  subject: string;
  body: string;
  status: ApplicationStatus;
  admin_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteApplicationAdminRow = SiteApplication & {
  applicant_label: string | null;
};

export function isApplicationType(value: string): value is ApplicationType {
  return (APPLICATION_TYPES as readonly string[]).includes(value);
}

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function applicationTypeLabel(type: ApplicationType): string {
  switch (type) {
    case "staff":
      return "Staff";
    case "partner":
      return "Partenaire";
    case "other":
      return "Autre";
  }
}

export function applicationStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case "pending":
      return "En attente";
    case "accepted":
      return "Acceptée";
    case "rejected":
      return "Refusée";
    case "withdrawn":
      return "Retirée";
  }
}

export function validateApplicationInput(input: {
  type: string;
  subject: string;
  body: string;
}): { ok: true; type: ApplicationType; subject: string; body: string } | { ok: false; error: string } {
  if (!isApplicationType(input.type)) {
    return { ok: false, error: "invalid_type" };
  }
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length < 3 || subject.length > 120) {
    return { ok: false, error: "invalid_subject" };
  }
  if (body.length < 20 || body.length > 8000) {
    return { ok: false, error: "invalid_body" };
  }
  return { ok: true, type: input.type, subject, body };
}
