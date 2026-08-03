import { referenceKey } from "@/lib/deadlock/link-content";
import {
  getPatchSubjectBorderColor,
  PATCH_SUBJECT_AVATAR_LIMIT,
} from "@/lib/deadlock/changed-subjects";
import type { DeadlockReference } from "@/lib/deadlock/types";

export default function PatchSubjectAvatars({
  subjects,
}: {
  subjects: DeadlockReference[];
}) {
  if (subjects.length === 0) {
    return null;
  }

  const visible = subjects.slice(0, PATCH_SUBJECT_AVATAR_LIMIT);
  const overflow = subjects.length - visible.length;

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${subjects.length} héros ou objets modifiés`}
    >
      {visible.map((subject) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={referenceKey(subject)}
          src={subject.image}
          alt={subject.name}
          title={subject.name}
          width={16}
          height={16}
          className="size-8 shrink-0 rounded-[3px] border object-cover"
          style={{ borderColor: getPatchSubjectBorderColor(subject) }}
          loading="lazy"
          decoding="async"
        />
      ))}
      {overflow > 0 ? (
        <span
          className="ml-0.5 text-[10px] font-semibold leading-none tabular-nums"
          style={{ color: "#6BB89A" }}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
