import path from "node:path";
import { fileURLToPath } from "node:url";
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
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
