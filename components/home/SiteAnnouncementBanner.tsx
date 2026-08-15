import type { SiteAnnouncement } from "@/lib/admin/types";

export default function SiteAnnouncementBanner({
  announcements,
}: {
  announcements: SiteAnnouncement[];
}) {
  if (announcements.length === 0) return null;

  return (
    <aside
      className="border-b border-[#c9a24a]/35 bg-[#c9a24a]/12"
      aria-label="Annonces"
    >
      <div className="mx-auto flex max-w-1500px flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {announcements.map((item) => (
          <div key={item.id} className="text-sm leading-relaxed">
            <p className="font-colus text-base uppercase tracking-wide text-[#f0d090]">
              {item.title}
            </p>
            {item.body ? (
              <p className="mt-1 text-foreground/90 whitespace-pre-wrap">
                {item.body}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </aside>
  );
}
