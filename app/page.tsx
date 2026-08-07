import type { Metadata } from "next";

import LandingHero from "@/components/home/LandingHero";
export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Deadlock France - Actualités, événements, et discord communautaire.",
};

export default async function HomePage() {

  return (
    <div>
      <LandingHero />
    </div>
  );
}
