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

## Notes

- All three stories branch independently from `Admin Dashboard` and converge at `Admin reporting` — they are parallel, not sequential.
- The original diagram carries several open design questions as sticky notes (e.g. how refunds are handled vs. Stripe, whether the admin can override lounge-set restrictions, how blackout dates are surfaced). These are unresolved product questions, not flow logic — flag them if implementing Epic 8.
