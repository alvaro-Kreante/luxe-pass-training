import { Skeleton } from "@/components/ui/skeleton";

/**
 * `Loading.dc.html` — el estado antes de que llegue la disponibilidad, solo
 * alcanzable por `?loading=1` (docs/PENDIENTES.md): no hay red que consultar,
 * así que no tiene otro disparador real.
 */
export function ProfileSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden px-8 pb-7 pt-5.5">
      <div className="grid h-[268px] shrink-0 grid-cols-[1fr_348px] gap-3">
        <Skeleton className="rounded-[18px]" />
        <div className="flex flex-col gap-3">
          <Skeleton className="flex-1 rounded-[18px]" />
          <Skeleton className="flex-1 rounded-[18px]" />
        </div>
      </div>

      <div className="flex flex-1 gap-7">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="mt-3.5 h-[15px] w-[460px]" />
          <Skeleton className="mt-7 h-3 w-24" />

          <div className="mt-3.5 grid grid-cols-2 gap-x-5.5 gap-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-[10px]" />
                <div className="flex-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="mt-1.5 h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-fit w-[344px] shrink-0 rounded-content border border-line bg-surface p-5.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-[22px] w-[88px] rounded-pill" />
          </div>
          <Skeleton className="mt-4 h-6 w-[210px]" />
          <Skeleton className="mt-2.5 h-3.5 w-40" />
          <div className="my-5 h-px bg-line" />
          <Skeleton className="h-3.5 w-36" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-[42px] flex-1 rounded-[11px]" />
            <Skeleton className="h-[42px] flex-1 rounded-[11px]" />
            <Skeleton className="h-[42px] flex-1 rounded-[11px]" />
          </div>
          <Skeleton className="mt-3.5 h-[52px] rounded-control" />

          <div
            role="status"
            className="mt-4.5 flex items-center justify-center gap-2.5 border-t border-line pt-4"
          >
            <span className="spinner text-accent" aria-hidden>
              ◐
            </span>
            <span className="text-[12.5px] text-fg-subtle">
              Checking live availability…
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
