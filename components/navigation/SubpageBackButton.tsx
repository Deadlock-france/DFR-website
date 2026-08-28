"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/shadcn/button";

/** Pages top-level (sidebar) : pas de bouton retour. */
const TOP_LEVEL_PATHS = new Set([
  "/",
  "/patch-notes",
  "/profil",
  "/showmatch",
  "/news",
  "/candidatures",
]);

function fallbackHref(pathname: string): string {
  if (pathname.startsWith("/patch-notes/")) return "/patch-notes";
  if (pathname.startsWith("/news/")) return "/news";
  if (pathname.startsWith("/showmatch/")) return "/showmatch";
  if (pathname.startsWith("/equipes")) return "/profil";
  if (pathname === "/amis" || pathname === "/profil") return "/";
  return "/";
}

function canGoBackInApp(): boolean {
  if (typeof document === "undefined") return false;
  const { referrer } = document;
  if (!referrer) return false;
  try {
    return new URL(referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

function SubpageBackButtonInner() {
  const pathname = usePathname();
  const router = useRouter();

  if (TOP_LEVEL_PATHS.has(pathname)) return null;

  return (
    <div className="px-4 pt-5 sm:px-5 lg:px-8">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Retour"
        onClick={() => {
          if (canGoBackInApp()) {
            router.back();
            return;
          }
          router.push(fallbackHref(pathname));
        }}
        className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Retour
      </Button>
    </div>
  );
}

/** usePathname exige un Suspense parent avec Cache Components. */
export default function SubpageBackButton() {
  return (
    <Suspense fallback={null}>
      <SubpageBackButtonInner />
    </Suspense>
  );
}
