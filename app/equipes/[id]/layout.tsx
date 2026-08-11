import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Équipe",
  description: "Équipe Deadlock France",
};

export default function EquipeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
