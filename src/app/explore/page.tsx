"use client";

import * as React from "react";
import {
  LayoutList,
  Map as MapIcon,
  RotateCcw,
  Search,
  SlidersHorizontal,
  WifiOff,
} from "lucide-react";

import { RequireSession } from "@/components/onboarding/require-session";
import { AppShell } from "@/components/patterns/app-shell";
import { ExploreLayout } from "@/components/patterns/explore-layout";
import { CityMap } from "@/components/explore/city-map";
import {
  LocationPermissionDialog,
  ManualLocationDialog,
} from "@/components/explore/location-dialogs";
import { FilterDrawer } from "@/components/explore/filter-drawer";
import { LoungeCallout } from "@/components/explore/lounge-callout";
import { LoungeList } from "@/components/explore/lounge-list";
import { NoResults } from "@/components/explore/no-results";
import { ResultCard } from "@/components/explore/result-card";
import { Button } from "@/components/ui/button";
import { RemovableChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { formatDistanceBand, type DistanceUnit } from "@/lib/distance";
import {
  EMPTY_FILTERS,
  activeFilterChips,
  applyFilters,
  suggestionsToRecoverResults,
  type Filters,
} from "@/lib/filters";
import { getCurrentPosition, type LocationResult } from "@/lib/geolocation";
import { useOnlineStatus } from "@/lib/online-status";
import { DEFAULT_CITY_ID, cityById, cityLabel } from "@/lib/location";
import {
  fetchLounges,
  withDistance,
  type LoungeRow,
} from "@/lib/lounge-directory";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 2.1 — Map-Based Lounge Discovery.
 * Artboards: Main.dc.html · LocationPermission.dc.html · ManualLocation.dc.html
 * MapError.dc.html · Offline.dc.html
 *
 * Backend real (Supabase local): el catálogo viene de `lib/lounge-directory.ts`
 * y la distancia se calcula de verdad desde la ubicación del miembro
 * (`lib/geolocation.ts`). El proveedor de mapa real, el modo offline con
 * service worker y el tiempo de carga real del mapa siguen fuera de alcance
 * — ver docs/design/COMPONENT-MAP.md "Backend real — Epic 2".
 */

/** Cuántos lounges quedaron guardados de la última visita (Offline.dc.html). */
const CACHED_LOUNGE_COUNT = 6;

type LocationStep = "asking" | "manual" | "located";

export default function ExplorePage() {
  return (
    <RequireSession>
      <ExploreScreen />
    </RequireSession>
  );
}

function ExploreScreen() {
  const online = useOnlineStatus();
  const offline = !online;

  /** Un miembro que vuelve sin conexión ya dio su ubicación antes: se salta el permiso. */
  const [step, setStep] = React.useState<LocationStep>(
    offline ? "located" : "asking",
  );
  const [cityId, setCityId] = React.useState(DEFAULT_CITY_ID);
  const [origin, setOrigin] = React.useState(() => {
    const city = cityById(DEFAULT_CITY_ID);
    return { lat: city.lat, lng: city.lng };
  });
  const [allLounges, setAllLounges] = React.useState<LoungeRow[] | null>(null);
  const [unit, setUnit] = React.useState<DistanceUnit>("mi");
  const [view, setView] = React.useState<"map" | "list">("map");
  const [mapFailed, setMapFailed] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;

    fetchLounges(supabase).then((rows) => {
      if (active) setAllLounges(rows);
    });

    return () => {
      active = false;
    };
  }, []);

  const city = cityById(cityId);
  const cityLounges = (allLounges ?? []).filter(
    (lounge) => lounge.cityId === cityId,
  );
  const nearby = withDistance(cityLounges, origin);
  /** Sin conexión solo existe lo que quedó guardado de la última visita. */
  const available = offline ? nearby.slice(0, CACHED_LOUNGE_COUNT) : nearby;
  const filtered = applyFilters(available, filters);
  const lounges = filtered;
  const selected = lounges.find((lounge) => lounge.id === selectedId) ?? null;

  const chips = activeFilterChips(filters, unit);
  const activeFilterCount = chips.length + (filters.query.trim() ? 1 : 0);
  const suggestions = suggestionsToRecoverResults(available, filters);
  const empty = lounges.length === 0 && activeFilterCount > 0;

  /** Patrón 4: la pantalla de fondo se difumina mientras hay un diálogo abierto. */
  const behindDialog = step !== "located";

  async function handleAllow() {
    const result: LocationResult = await getCurrentPosition();

    if (result.status === "granted") {
      setOrigin(result.coords);
      setStep("located");
      return;
    }

    /** AC "Fallback to manual location entry if GPS unavailable". */
    setStep("manual");
  }

  const chooseCity = (id: string) => {
    const chosen = cityById(id);
    setCityId(id);
    setOrigin({ lat: chosen.lat, lng: chosen.lng });
    setSelectedId(null);
    setStep("located");
  };

  return (
    <AppShell padded={false} blurred={behindDialog}>
      <ExploreLayout
        banner={offline ? <OfflineBanner count={available.length} /> : null}
        filters={
          chips.length > 0 ? (
            <>
              {chips.map((chip) => (
                <RemovableChip
                  key={chip.id}
                  label={chip.label}
                  onRemove={() => setFilters(chip.without)}
                />
              ))}
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="ml-1.5 cursor-pointer text-[12.5px] font-bold text-accent-strong transition-colors duration-150 hover:text-fg"
              >
                Clear all
              </button>
              <span className="ml-auto text-[12.5px] text-fg-subtle">
                Results update as you filter
              </span>
            </>
          ) : null
        }
        topbar={
          <>
            <Input
              aria-label="Search lounges"
              disabled={offline}
              value={filters.query}
              onChange={(event) =>
                setFilters({ ...filters, query: event.target.value })
              }
              placeholder={
                offline ? "Search needs a connection" : "Search by name, city or amenity"
              }
              icon={<Search size={18} strokeWidth={1.7} />}
              className="lg:w-[376px]"
            />

            <Button
              variant="outline"
              size="lg"
              onClick={() => setFiltersOpen(true)}
              className="gap-2.5 px-4.5 text-[13px] tracking-normal normal-case"
            >
              <SlidersHorizontal size={17} strokeWidth={1.8} />
              Filters
              {activeFilterCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-accent px-1.5 text-[11.5px] font-bold text-on-accent">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>

            <div className="flex flex-1 items-center justify-end gap-3.5">
              <Segmented
                label="Distance units"
                size="sm"
                value={unit}
                onChange={setUnit}
                options={[
                  { value: "mi", label: "mi" },
                  { value: "km", label: "km" },
                ]}
              />

              <Segmented
                label="Result view"
                value={view}
                onChange={setView}
                options={[
                  { value: "map", label: "Map", icon: MapIcon },
                  { value: "list", label: "List", icon: LayoutList },
                ]}
              />
            </div>
          </>
        }
        panel={
          empty || view === "list" ? null : (
          <>
            <div className="px-5.5 pb-3 pt-5">
              <Eyebrow className="mb-1.5">
                {offline
                  ? `${lounges.length} cached lounges`
                  : `${lounges.length} lounges near you`}
              </Eyebrow>
              <p className="m-0 text-[12.5px] text-fg-subtle">
                {offline
                  ? "Distances from your last known location · Live availability unavailable"
                  : `Sorted by distance · ${cityLabel(city)}`}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5.5 pb-5.5">
              {lounges.map((lounge) => (
                <ResultCard
                  key={lounge.id}
                  lounge={lounge}
                  unit={unit}
                  selected={lounge.id === selectedId}
                  onSelect={() => setSelectedId(lounge.id)}
                  cachedNote={offline ? "Saved 2h ago" : undefined}
                />
              ))}
            </div>
          </>
          )
        }
      >
        {empty ? (
          <NoResults
            activeFilterCount={activeFilterCount}
            totalNearby={available.length}
            suggestions={suggestions}
            onApply={(suggestion) => setFilters(suggestion.filters)}
            onBackToMap={() => setFilters(EMPTY_FILTERS)}
            onClearAll={() => setFilters(EMPTY_FILTERS)}
          />
        ) : view === "list" ? (
          <LoungeList
            lounges={lounges}
            unit={unit}
            loading={allLounges === null}
            distanceNote={
              filters.maxDistanceMiles === null
                ? `Searching near ${cityLabel(city)}`
                : `Searching within ${formatDistanceBand(filters.maxDistanceMiles, unit)} of your location`
            }
          />
        ) : (
          mapFailed ? (
            <MapErrorState
              count={lounges.length}
              onRetry={() => setMapFailed(false)}
              onUseList={() => {
                setMapFailed(false);
                setView("list");
              }}
            />
          ) : (
            <CityMap
              lounges={lounges}
              origin={origin}
              selectedId={selectedId ?? undefined}
              onSelect={setSelectedId}
              onLoadError={() => setMapFailed(true)}
              offline={offline}
              footer={<MapFooter unit={unit} offline={offline} />}
            >
              {selected ? <LoungeCallout lounge={selected} unit={unit} /> : null}
            </CityMap>
          )
        )}
      </ExploreLayout>

      <LocationPermissionDialog
        open={step === "asking"}
        onAllow={handleAllow}
        onEnterManually={() => setStep("manual")}
      />

      <FilterDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        lounges={available}
        filters={filters}
        onChange={setFilters}
      />

      <ManualLocationDialog
        open={step === "manual"}
        onConfirm={chooseCity}
        onRetryGps={() => setStep("asking")}
        lounges={allLounges ?? []}
      />
    </AppShell>
  );
}

function OfflineBanner({ count }: { count: number }) {
  return (
    <div
      data-theme="dark"
      className="flex min-h-12 flex-wrap items-center gap-3 bg-panel-black px-5 py-2 lg:flex-nowrap lg:px-8 lg:py-0"
    >
      <WifiOff size={17} strokeWidth={1.8} className="text-accent" />
      <span className="text-[13px] font-bold text-dark-ink-100">
        You&apos;re offline
      </span>
      <span className="text-[13px] text-dark-ink-300">
        Showing {count} lounges saved from your last visit · Updated 2h ago
      </span>
      <button
        type="button"
        className="ml-auto flex h-[30px] cursor-pointer items-center gap-[7px] rounded-[15px] border border-dark-border px-3.5 text-xs font-bold text-dark-ink-100 transition-colors duration-150 hover:bg-surface-hover"
      >
        <RotateCcw size={14} strokeWidth={1.9} className="text-accent" />
        Retry connection
      </button>
    </div>
  );
}

function MapErrorState({
  count,
  onRetry,
  onUseList,
}: {
  count: number;
  onRetry: () => void;
  onUseList: () => void;
}) {
  return (
    <div className="surface-blush dot-pattern relative flex flex-1 items-center justify-center p-8">
      <EmptyState
        icon={MapIcon}
        title="The map isn't loading"
        description={`It has been more than three seconds without a response. Check your connection, or browse the same ${count} lounges as a list.`}
        footnote="Your filters and search stay applied either way."
      >
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={onUseList}>
            Use list view
          </Button>
          <Button block onClick={onRetry}>
            Retry
          </Button>
        </div>
      </EmptyState>
    </div>
  );
}

function MapFooter({
  unit,
  offline,
}: {
  unit: DistanceUnit;
  offline: boolean;
}) {
  return (
    <div className="absolute bottom-5 left-5 flex flex-wrap items-center gap-2.5">
      <span className="flex h-8 items-center gap-2 rounded-2xl border border-line bg-white/90 px-3">
        <span aria-hidden className="h-[5px] w-11 rounded-[3px] bg-fg-muted" />
        <span className="text-[11.5px] font-bold text-fg-muted">
          {unit === "mi" ? "0.5 mi" : "0.8 km"}
        </span>
      </span>
      <span className="flex h-8 items-center rounded-2xl border border-line bg-white/90 px-3 text-[11.5px] text-fg-subtle">
        {offline
          ? "Panning outside the cached area needs a connection"
          : `Distances in ${unit === "mi" ? "miles" : "kilometres"}, from your phone settings`}
      </span>
    </div>
  );
}
