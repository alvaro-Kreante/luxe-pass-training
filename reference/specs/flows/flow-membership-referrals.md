# Flow: Membership and Referrals

**Original diagram:** [images/membership-referrals.jpg](./images/membership-referrals.jpg)
**Covers:** [Epic 9 - Membership & Referrals](../epic-9-membership-referrals/)

## Diagram

```mermaid
flowchart TD
    ProfileAccess(["Member profile access"]) --> MembershipSection
    ProfileAccess --> ReferralProgram

    subgraph Story91["Story 9.1 - Membership"]
        MembershipSection["Membership section: view membership details"] --> MembershipDisplay["Membership display: active/inactive status, current plan"]
        MembershipDisplay --> BenefitsExpl["Benefits explanation: what you get with Luxe Pass"]
        BenefitsExpl --> MonthlySub{"Monthly subscriber?"}
        MonthlySub -->|Yes| UpgradeOptions["Upgrade options: monthly to yearly pricing"]
        MonthlySub -->|No| RenewalDate["Renewal date: auto-renewal settings, notice a month in advance"]
        UpgradeOptions --> RenewalDate
    end

    subgraph Story92["Story 9.2 - Referral Program"]
        ReferralProgram["Referral program: share and earn rewards"] --> RefCodeGen["Referral code generation: unique code, personal link"]
        RefCodeGen --> EasySharing["Easy sharing: social media, email, SMS, copy link"]
        EasySharing --> RefTracking["Referral tracking: sent invitations, status updates"]
        RefTracking --> FriendSignup{"Friend signs up?"}
        FriendSignup -->|Yes| FriendConfirm["Friend sign-up confirmation: notification to referrer"]
        FriendConfirm --> RewardCrediting["Reward crediting: credit referral, pending status, update balance"]
        RewardCrediting --> RewardConfirm["Reward confirmation: credited, applied to next renewal"]
        FriendSignup -->|No| TrackingComplete["Tracking complete: continue monitoring"]
        RewardConfirm --> RefHistory["Referral history: successful referrals, earned rewards, total savings"]
        TrackingComplete --> RefHistory
        RefTracking --> RefTerms["Referral terms and conditions: reward amounts, qualifying conditions, payout timeline"]
        RefTerms --> RefHistory
    end

    RenewalDate --> ProfileUpdated["Profile updated: membership settings saved"]
    RefHistory --> ProfileUpdated
    ProfileUpdated --> ReturnDashboard["Return to Dashboard: updated membership info"]
```

## Story Segments

| Story | Segment in diagram |
|---|---|
| [Story 9.1 - Membership](../epic-9-membership-referrals/story-9.1-membership.md) | Subgraph "Story 9.1": `Membership section` → `Renewal date` |
| [Story 9.2 - Referral Program](../epic-9-membership-referrals/story-9.2-referral-program.md) | Subgraph "Story 9.2": `Referral program` → `Referral terms and conditions` |

## Notes

- The reward-crediting path (`Reward crediting` → `Reward confirmation` → `Referral history`) is marked with open-question flags in the original diagram — the exact reward mechanics (amount, trigger timing) were still pending at time of writing.
