import type { Metadata } from "next";

import LandingHero from "@/components/home/LandingHero";
export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Hub francophone Deadlock : actus Steam traduites, showmatches, équipe et outils communautaires.",
};

export default async function HomePage() {

  return (
    <div>
      <LandingHero />
    </div>
  );
}
