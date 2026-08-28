import { cn } from "@/lib/utils";

export default function AdminRoleBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[9rem] items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 22%, transparent)`,
        color,
      }}
      title={name}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
