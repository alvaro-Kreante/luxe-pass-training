# Flow: Partner Experience

**Original diagram:** [images/partner-experience.jpg](./images/partner-experience.jpg)
**Covers:** [Epic 7 - Partner Dashboard](../epic-7-partner-dashboard/)

## Diagram

```mermaid
flowchart TD
    PartnerLogin(["Partner Login"]) --> PartnerDashboard["Partner Dashboard: daily overview screen"]

    PartnerDashboard --> GuestList
    PartnerDashboard --> BookingNotif
    PartnerDashboard --> PartnerAnalytics

    subgraph Story71["Story 7.1 - Daily Guest Management"]
        GuestList["Today's guest list"] --> GuestDisplay["Guest list display: name, contact, LP# confirmation, booking date"]
        GuestDisplay --> RealTimeUpdates["Real-time updates: new booking notifications, auto refresh, live changes"]
        RealTimeUpdates --> CheckinStatus["Check-in status tracking: arrived / no-show / pending"]
        CheckinStatus --> CheckinActions["Check-in actions: checkbox interface, click to mark attendance"]
        CheckinActions --> NoShowRecording["No-show recording: track attendance, update status, generate reports"]
        NoShowRecording --> GuestContactInfo["Guest contact info: access for communication"]
        GuestContactInfo --> PrintList["Print-friendly guest list: CSV export"]
        PrintList --> SearchFilter["Search/filter guests: by name or date"]
    end

    subgraph Story72["Story 7.2 - Booking Notifications for Partners"]
        BookingNotif["Booking notifications: partner notification system"] --> NewBookingEmail["New booking email: immediate notification, guest details included"]
        NewBookingEmail --> MorningDigest["Morning digest email: daily guest list, sent each morning"]
        MorningDigest --> CancelNotif["Cancellation notifications: guest count updated"]
        CancelNotif --> WaitlistAlert["Waitlist promotion alerts: waitlisted guest confirmed"]
    end

    subgraph Story73["Story 7.3 - Partner Analytics"]
        PartnerAnalytics["Partner analytics: booking insights reports"] --> VolumeReports["Weekly/monthly booking volume reports, usage patterns"]
        VolumeReports --> RevenueAttribution["Revenue attribution from Luxe Pass bookings"]
        RevenueAttribution --> RepeatGuest["Repeat guest identification: loyalty trackers"]
        RepeatGuest --> DownloadReports["Downloadable reports: export to CSV"]
    end

    SearchFilter --> EndOfDay["End of day: review daily activity, complete guest records"]
    WaitlistAlert --> EndOfDay
    DownloadReports --> EndOfDay
```

## Story Segments

| Story | Segment in diagram |
|---|---|
| [Story 7.1 - Daily Guest Management](../epic-7-partner-dashboard/story-7.1-daily-guest-management.md) | Subgraph "Story 7.1": `Today's guest list` → `Search/filter guests` |
| [Story 7.2 - Booking Notifications for Partners](../epic-7-partner-dashboard/story-7.2-booking-notifications-for-partners.md) | Subgraph "Story 7.2": `Booking notifications` → `Waitlist promotion alerts` |
| [Story 7.3 - Partner Analytics](../epic-7-partner-dashboard/story-7.3-partner-analytics.md) | Subgraph "Story 7.3": `Partner analytics` → `Downloadable reports` |

## Notes

- All three stories branch independently from the same `Partner Dashboard` and converge again at `End of day` — they are parallel, not sequential.
