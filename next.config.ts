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
})(nextConfig);
