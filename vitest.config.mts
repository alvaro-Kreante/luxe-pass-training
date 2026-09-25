import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Los artboards son la fuente de diseño; los tests no los miran.
 * Ver "Metodología de test — TDD" en CLAUDE.md.
 */
const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src");

export default defineConfig({
  // El tsconfig usa jsx: "preserve" para Next, así que el transformador de
  // Vitest necesita que se le diga explícitamente cómo tratar el JSX.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": src },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./vitest.global-setup.ts"],
    // La suite corre contra Supabase local y el sandbox de Stripe reales, en
    // paralelo: con los 5s/10s por defecto, cada corrida completa fallaba por
    // timeout en tests distintos (Stripe, altas de usuario en hooks).
    testTimeout: 20000,
    hookTimeout: 30000,
    include: ["src/**/*.test.{ts,tsx}"],
    // Story 1.1 — los tests que llaman a Supabase local necesitan las
    // mismas variables que `npm run dev`. Vite no carga `.env.local` en
    // modo "test" por convención, así que se pide con otro modo.
    env: loadEnv("development", process.cwd(), ""),
  },
});
