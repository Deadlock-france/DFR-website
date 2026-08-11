import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/shadcn/tooltip"
import "./globals.css";
import AppShell from "@/components/AppShell";

const colus = localFont({
  src: "../public/fonts/ColusRegular.otf",
  variable: "--font-colus-family",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Deadlock France",
  description: "Deadlock France",
};

/** Requis pour que env(safe-area-inset-*) soit non nul sur iOS Safari. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`dark ${colus.variable}`}>
      <body>
        <TooltipProvider>
          <AppShell>
            {children}
          </AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
