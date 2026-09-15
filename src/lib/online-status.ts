"use client";

import * as React from "react";

/**
 * Story 2.1 — "Offline mode shows cached nearby locations", con la condición
 * real (`navigator.onLine` + eventos `online`/`offline`) en vez del query
 * param `?offline=1` simulado que usaba /explore antes del proveedor real.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = React.useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  React.useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
