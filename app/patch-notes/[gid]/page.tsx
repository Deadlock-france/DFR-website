import { getSteamNews, getSteamNewsByGid } from "@/lib/steam/client";
import { notFound } from "next/navigation";
import ArticleView from "@/components/patch-notes/details/ArticleView";

interface NewsPageProps {
  params: Promise<{ gid: string }>;
}

export async function generateStaticParams() {
  const items = await getSteamNews(1422450, 50);

  return items.map((item) => ({ gid: item.gid }));
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { gid } = await params;
  const item = await getSteamNewsByGid(1422450, 50, gid);

  if (!item) {
    notFound();
  }

  return <ArticleView item={item} />;
}
