# Flow: Admin and Support Experience

**Original diagram:** [images/admin-support-experience.jpg](./images/admin-support-experience.jpg)
**Covers:** [Epic 8 - Admin & Support](../epic-8-admin-support/)

## Diagram

```mermaid
flowchart TD
    AdminLogin(["Admin login"]) --> AdminDashboard["Admin Dashboard: main control center"]

    AdminDashboard --> CustSupport
    AdminDashboard --> DataAnalytics
    AdminDashboard --> ContentMgmt
    AdminDashboard --> BookingsOverview

    subgraph Story81["Story 8.1 - Customer Support Dashboard"]
        CustSupport["Customer support"] --> MemberSearch["Member search: by name, email, phone"]
        MemberSearch --> MemberInfo["Member info: booking history, payment details, account status, membership type"]
        MemberInfo --> IssueTracking["Issue tracking: log issues, resolution notes, case management, status"]
        IssueTracking --> BookingModification["Booking modification: modify, cancel, reschedule, override restrictions"]
        BookingModification --> RefundProcessing["Refund processing: handle refunds, manage disputes"]
        RefundProcessing --> CommLog["Communication log with customer: policy exceptions, complex cases"]
        CommLog --> NoShowTrackingAdmin["No-show tracking: receive reports from partners, analysis"]
    end

    subgraph Story82["Story 8.2 - Data Export & Analytics"]
        DataAnalytics["Data and Analytics"] --> UserDataExport["User data export: anonymized, member statistics, usage pattern"]
        UserDataExport --> BookingDataExport["Booking data export: date range, reservation analytics"]
        BookingDataExport --> RevenueReporting["Revenue reporting: by partner, by period, growth metrics"]
        RevenueReporting --> MemberMetrics["Member metrics: acquisition, retention, churn, lifetime value"]
        MemberMetrics --> PopularityReports["Popularity reports: top lounges, top amenities, demand trends"]
        PopularityReports --> GeoUsage["Geographic usage: location patterns, city performance"]
        GeoUsage --> AutomatedReports["Automated reports: daily/weekly/monthly, scheduled delivery"]
        AutomatedReports --> ExportFormats["Export formats: CSV, email delivery"]
        ExportFormats --> BusinessIntel["Business intelligence: strategic decisions, growth planning"]
    end

    subgraph Story83["Story 8.3 - Content Management"]
        ContentMgmt["Content management"] --> LoungeProfileMgmt["Lounge profile management: add/edit/remove/archive lounges"]
        LoungeProfileMgmt --> ImageMgmt["Image management: upload up to 3 photos, manage galleries"]
        ImageMgmt --> AmenityHours["Amenity and hours updates: amenity lists (incl. shower), operating hours, seasonal changes, closures"]
        AmenityHours --> BookingAvailability["Booking availability: availability windows, holiday schedules, capacity limits"]
        BookingAvailability --> BulkUpdate["Bulk update capabilities: mass changes, batch processing"]
    end

    subgraph Story84["Story 8.4 - Bookings Overview"]
        BookingsOverview["Bookings overview: every booking across the network"] --> ChooseDay["Choose a day: opens on today, previous/next day, calendar"]
        ChooseDay --> FilterBookings["Filter: lounge, partner, status, member name or LP reference"]
        FilterBookings --> ByArrival["Grouped by arrival time: member, reference, lounge, status"]
        ByArrival --> BandCapacity{"One lounge selected?"}
        BandCapacity -->|Yes| SeatsByBand["Seats taken vs. capacity per band"]
        BandCapacity -->|No| OpenBooking
        SeatsByBand --> OpenBooking["Open a booking"]
        OpenBooking --> BookingModification
        OpenBooking --> ChangeStatus["Change the status: confirmed, checked in, no-show (no fee from admin)"]
    end

    NoShowTrackingAdmin --> AdminReporting["Admin reporting: comprehensive dashboard, KPI monitoring, executive summaries"]
    BusinessIntel --> AdminReporting
    BulkUpdate --> AdminReporting

    AdminReporting --> ActionItems["Action items: follow-up tasks, process improvements, strategic initiatives"]
```

## Story Segments

| Story | Segment in diagram |
|---|---|
| [Story 8.1 - Customer Support Dashboard](../epic-8-admin-support/story-8.1-customer-support-dashboard.md) | Subgraph "Story 8.1": `Customer support` → `No-show tracking` |
| [Story 8.2 - Data Export & Analytics](../epic-8-admin-support/story-8.2-data-export-analytics.md) | Subgraph "Story 8.2": `Data and Analytics` → `Business intelligence` |
| [Story 8.3 - Content Management](../epic-8-admin-support/story-8.3-content-management.md) | Subgraph "Story 8.3": `Content management` → `Bulk update capabilities` |
| [Story 8.4 - Bookings Overview](../epic-8-admin-support/story-8.4-bookings-overview.md) | Subgraph "Story 8.4": `Bookings overview` → `Change the status`, reusing `Booking modification` from 8.1 |

## Notes

- Stories 8.1–8.3 branch independently from `Admin Dashboard` and converge at `Admin reporting` — they are parallel, not sequential.
- Story 8.4 was added by the team (13 Oct 2026), not drawn in the original diagram. It does not converge at `Admin reporting`: it is a second way into the 8.1 `Booking modification`, without first finding the member. Partner filter, calendar and `Change the status` were added at the user's request after the acceptance criteria were written.
- The original diagram carries several open design questions as sticky notes (e.g. how refunds are handled vs. Stripe, whether the admin can override lounge-set restrictions, how blackout dates are surfaced). These are unresolved product questions, not flow logic — flag them if implementing Epic 8.
