# Flow: Location Discovery & Search

**Original diagram:** [images/location-discovery-search.jpg](./images/location-discovery-search.jpg)
**Covers:** [Epic 2 - Location Discovery & Search](../epic-2-location-discovery-search/)
**Leads into:** [flow-complete-booking-journey.md](./flow-complete-booking-journey.md) (Epic 3)

## Diagram

```mermaid
flowchart TD
    Home(["Home screen"]) --> Explore["Tap to explore: bottom navigation"]
    Explore --> LocPermission["Location permission request"]
    LocPermission --> PermGranted{"Permission granted?"}

    PermGranted -->|Yes| GPS["Current location detection: GPS, distance in mi/km per phone setup"]
    GPS --> LocFound{"Location found?"}
    LocFound -->|Yes| ChooseView["Choose view type"]
    LocFound -->|No| GPSUnavailable["GPS unavailable: fallback to manual entry"]
    PermGranted -->|No| GPSUnavailable
    GPSUnavailable --> ManualEntry["Manual location entry: type city or address"]
    ManualEntry --> ChooseView

    ChooseView --> MapView["MAP VIEW"]
    ChooseView --> ListView["LIST VIEW"]

    subgraph Story21["Story 2.1 - Map-Based Lounge Discovery"]
        MapView --> MapLoading["Interactive map loading"]
        MapLoading --> MapLoaded{"Map loaded? (target: within 3s)"}
        MapLoaded -->|No| MapError["Map loading error: retry or switch to list view"]
        MapError --> MapLoading
        MapLoaded -->|Yes| MapDisplay["Map display: location marker, En Soleil branded lounge markers, distance mi/km, zoom/pan"]
        MapDisplay --> Connection{"Connection available?"}
        Connection -->|No| OfflineMode["Offline mode: cached nearby locations, limited functionality"]
        Connection -->|Yes| ApplyFilters["Apply filters"]
        OfflineMode --> ApplyFilters
    end

    MapError -.->|switch view| ListView

    subgraph Story22["Story 2.2 - Lounge Filtering & Search"]
        ApplyFilters --> FilterOptions["Filter options: amenities (WiFi, Lounge, Spa, Co-working, Day Rooms, Luggage storage)"]
        FilterOptions --> DistanceFilter["Distance filter: <0.5mi / <1mi / <2mi / <5mi"]
        DistanceFilter --> AvailFilter["Availability filter: calendar view, select dates"]
        AvailFilter --> TextSearch["Text search: name, location, amenities"]
        TextSearch --> ApplyFiltersRT["Apply filters: real-time results update"]
        ApplyFiltersRT --> ResultsFound{"Results found?"}
        ResultsFound -->|No| NoResults["No results state: suggestions to modify filters"]
        NoResults --> ClearFilters["Clear all filters: reset to default view"]
        ClearFilters --> FilterOptions
        ResultsFound -->|Yes| UpdatedResults["Updated results: filtered lounge list"]
    end

    UpdatedResults --> TapLounge["Tap lounge: select from map marker or list item"]
    UpdatedResults --> ToggleView["Toggle view: switch map/list, maintain filter state"]
    ToggleView --> ListView

    subgraph Story23["Story 2.3 - List View Alternative"]
        ListView --> ListLoading["List loading: fetch lounge data"]
        ListLoading --> ListDisplay["List display: sorted by distance, name/distance/amenity icons/availability, thumbnails, infinite scroll"]
        ListDisplay --> ApplyFilters
    end

    TapLounge --> LoungeDetail(["Lounge detail screen -> Epic 3"])
```

## Story Segments

| Story | Segment in diagram |
|---|---|
| [Story 2.1 - Map-Based Lounge Discovery](../epic-2-location-discovery-search/story-2.1-map-based-lounge-discovery.md) | `MAP VIEW` → `Apply filters` (subgraph "Story 2.1"), including offline/error handling |
| [Story 2.2 - Lounge Filtering & Search](../epic-2-location-discovery-search/story-2.2-lounge-filtering-search.md) | `Filter options` → `Updated results` (subgraph "Story 2.2") |
| [Story 2.3 - List View Alternative](../epic-2-location-discovery-search/story-2.3-list-view-alternative.md) | `LIST VIEW` → `List display` (subgraph "Story 2.3") |

## Notes

- Both Map View and List View converge on the same filter pipeline (`Apply filters` → `Filter options` → ... → `Updated results`), so Story 2.2's filtering logic applies identically regardless of which view the member is using.
- Tapping a lounge (from either the map marker or a list item) exits this flow into `flow-complete-booking-journey.md`, starting at the "Lounge selected" node.
