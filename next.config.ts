import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /**
   * `next build` y `next dev` no comparten directorio de salida.
   *
   * Compartiendo `.next`, un build lanzado mientras el dev server está vivo le
   * reescribe los chunks por debajo y lo deja sirviendo 500 con
   * `__webpack_modules__[moduleId] is not a function`, o 404 en rutas que sí
   * existen. El dev server no se entera: hay que borrar `.next` y reiniciarlo.
   *
   * `next build` y `next start` corren con NODE_ENV=production y usan
   * `.next-build`; `next dev` se queda con `.next`.
   *
   * Excepción: en Vercel (`vercel build`, con `VERCEL=1` seteado por su propio
   * entorno) también corre con NODE_ENV=production, pero su builder de
   * Next.js busca el resultado siempre en `.next` — un `distDir` custom ahí
   * rompe el deploy con "The Next.js output directory '.next' was not
   * found". En Vercel se vuelve al default; la separación de directorios
   * solo importa en local.
   */
  distDir: process.env.VERCEL
    ? ".next"
    : process.env.NODE_ENV === "production"
      ? ".next-build"
      : ".next",
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  /**
   * PERF-02 — las páginas que se renderizan en el servidor llevan datos del
   * miembro en el HTML (y en su payload RSC), y la caché del service worker
   * va por URL, no por usuario: en un dispositivo compartido serviría la
   * página del anterior. Esas rutas van solo por red; el resto sigue con la
   * caché por defecto (va delante: Workbox aplica la primera que coincide).
   * Al pasar otra ruta a Server Component, se añade aquí.
   */
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        // `/lounges/<id>`, `/my-pass` y `/admin/analytics` (no `/my-pass/<reference>` ni `/admin/analytics/demand`, que siguen en cliente).
        urlPattern: /^https?:\/\/[^/]+\/(?:lounges\/[^/?#]+|my-pass|admin\/analytics)(?:\?.*)?$/,
        handler: "NetworkOnly",
        options: { cacheName: "server-rendered-pages" },
      },
    ],
  },
})(nextConfig);
