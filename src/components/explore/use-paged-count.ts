"use client";

import * as React from "react";

/** Cuántos lounges trae cada tanda del scroll infinito. */
export const PAGE_SIZE = 12;

/**
 * Scroll infinito por tandas de `PAGE_SIZE`: devuelve cuántos mostrar y el
 * `ref` del centinela que, al entrar en pantalla, pide la tanda siguiente.
 * Cambiar el total (otro filtro, otra ubicación) vuelve a la primera tanda.
 */
export function usePagedCount(total: number) {
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const sentinel = React.useRef<HTMLDivElement>(null);

  const [totalWhenReset, setTotalWhenReset] = React.useState(total);
  if (totalWhenReset !== total) {
    setTotalWhenReset(total);
    setVisible(PAGE_SIZE);
  }

  const shown = Math.min(visible, total);
  const hasMore = shown < total;

  React.useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible((current) => current + PAGE_SIZE);
      }
    });

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, shown]);

  return { shown, hasMore, sentinel };
}
