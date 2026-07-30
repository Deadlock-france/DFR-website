import NewsListFeed from "@/components/patch-notes/NewsListFeed";
import PageHero from "@/components/patch-notes/PageHero";
import { getSteamNews } from "@/lib/steam/client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patch notes",
  description:
    "Patch notes Deadlock en français (traduction officielle Steam, DeepL en secours).",
};

export default async function NewsPage() {
  const articles = await getSteamNews(1422450, 50);

  return (
    <div>
      <PageHero
        title="Patch notes"
        description="Toutes les mises à jour de Deadlock, de la plus récente à la plus ancienne."
      />

      <NewsListFeed items={articles} />
    </div>
  );
}
