/**
 * DESIGN-SYSTEM.md §5 "Estados" — spinner de 18px, stroke `--gold-500`.
 * Acompaña al infinite scroll y a la carga de la lista.
 */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden
      className="spinner shrink-0 text-accent"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
