"use client";

import * as React from "react";

/**
 * Story 2.1 — "Map loads within 3 seconds on good connection". Antes se
 * simulaba con `?map=error`; ahora mide de verdad: si `handleLoad` (cableado
 * al `onLoad` del `APIProvider`) no se llama a tiempo, dispara `onLoadError`.
 * `onLoadError` también se cablea directo al `onError` del `APIProvider`
 * para un fallo inmediato del script, sin esperar el timeout.
 */
export function useMapLoadStatus(onLoadError: () => void, timeoutMs = 3000) {
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    loadedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadedRef.current) onLoadError();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [onLoadError, timeoutMs]);

  const handleLoad = React.useCallback(() => {
    loadedRef.current = true;
  }, []);

  return { handleLoad };
}
