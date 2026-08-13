import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/shadcn/tooltip"
import "./globals.css";
import AppShell from "@/components/AppShell";
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  TWITTER_HANDLE,
} from "@/lib/seo/site";
import { indexingRobots } from "@/lib/seo/metadata";

const colus = localFont({
  src: "../public/fonts/ColusRegular.otf",
  variable: "--font-colus-family",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — Patch notes et communauté francophone`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: getSiteUrl() }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "games",
  keywords: [
    "Deadlock",
    "Deadlock France",
    "patch notes Deadlock",
    "Deadlock français",
    "showmatch Deadlock",
    "communauté Deadlock FR",
  ],
  robots: indexingRobots(),
  alternates: {
    canonical: "/",
    languages: {
      fr: "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: getSiteUrl(),
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Patch notes et communauté francophone`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: `${SITE_NAME} — Patch notes et communauté francophone`,
    description: SITE_DESCRIPTION,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
};

/** Requis pour que env(safe-area-inset-*) soit non nul sur iOS Safari. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d1315",
  colorScheme: "dark",
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
