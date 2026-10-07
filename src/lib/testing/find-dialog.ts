import { screen, waitFor, type ByRoleOptions, type waitForOptions } from "@testing-library/react";
import { expect } from "vitest";

/**
 * Solo para tests. `screen.findByRole("dialog")` que además espera a que el
 * diálogo admita clics. Al abrir un modal, Radix (`DismissableLayer`) pone
 * `pointer-events: none` en el body y el contenido lo anula con `auto` un
 * render después; en CI, `findByRole` puede devolver el diálogo en ese hueco
 * y el primer clic dentro falla con "pointer-events: none".
 */
export async function findDialog(options?: ByRoleOptions, waitOptions?: waitForOptions) {
  const dialog = await screen.findByRole("dialog", options, waitOptions);
  await waitFor(() => expect(getComputedStyle(dialog).pointerEvents).not.toBe("none"), {
    timeout: waitOptions?.timeout ?? 8000,
  });
  return dialog;
}
