"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Décalage bas du visualViewport (barre Safari / clavier).
 * Sur iOS, fixed bottom:0 peut se retrouver sous la chrome du navigateur
 * quand elle s'affiche ; ce hook suit resize + scroll du visualViewport.
 */
export function useVisualViewportBottomInset(): number {
  const [inset, setInset] = useState(0);

  useLayoutEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      if (!vv) return;
      const next = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(next);
      document.documentElement.style.setProperty(
        "--mobile-vv-bottom",
        `${next}px`,
      );
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--mobile-vv-bottom");
    };
  }, []);

  return inset;
}
