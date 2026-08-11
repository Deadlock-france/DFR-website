import { Crown, Users } from "lucide-react";

import AppLink from "@/components/AppLink";
import { buttonVariants } from "@/components/shadcn/button";
import type { TeamMembership } from "@/lib/account/types";
import { teamRoleLabel } from "@/lib/account/types";
import { cn } from "@/lib/utils";

function TeamRow({ team }: { team: TeamMembership }) {
  return (
    <li>
      <AppLink
        href={`/equipes/${team.id}`}
        className="flex items-center gap-3 rounded-xl border px-4 py-3 no-underline transition-colors hover:bg-[color:var(--nav-hover)]"
        style={{ borderColor: "#1f2937" }}
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold tracking-wide"
          style={{
            backgroundColor: "rgba(74, 155, 127, 0.12)",
            color: "#6BB89A",
          }}
        >
          {team.tag}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {team.name}
          </p>
          <p className="text-xs text-muted-foreground">
            [{team.tag}] · {teamRoleLabel(team.role)}
          </p>
        </div>
      </AppLink>
    </li>
  );
}

export default function MyTeamsLists({
  teams,
}: {
  teams: TeamMembership[];
}) {
  const asCaptain = teams.filter((t) => t.role === "captain");
  const asMember = teams.filter((t) => t.role !== "captain");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: "#1f2937" }}
      >
        <div className="flex items-center gap-2">
          <Crown className="size-4" style={{ color: "#6BB89A" }} />
          <h2 className="text-base font-semibold">Capitaine</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Équipes que tu diriges.
        </p>

        {asCaptain.length === 0 ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Tu n&apos;es capitaine d&apos;aucune équipe.
            </p>
            <AppLink
              href="/equipes/nouvelle"
              className={cn(
                buttonVariants({ size: "sm" }),
                "w-fit border-0 font-semibold text-white no-underline",
              )}
              style={{ backgroundColor: "#4A9B7F" }}
            >
              Créer une équipe
            </AppLink>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {asCaptain.map((team) => (
              <TeamRow key={team.id} team={team} />
            ))}
          </ul>
        )}
      </section>

      <section
        className="rounded-2xl border p-6"
        style={{ borderColor: "#1f2937" }}
      >
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Membre / remplaçant</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Équipes où tu joues sans être capitaine.
        </p>

        {asMember.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucune autre équipe pour le moment.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {asMember.map((team) => (
              <TeamRow key={team.id} team={team} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
