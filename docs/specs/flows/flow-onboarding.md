# Flow: Onboarding

**Original diagram:** [images/onboarding.jpg](./images/onboarding.jpg)
**Covers:** [Epic 1 - User Onboarding & Authentication](../epic-1-user-onboarding-authentication/)

## Diagram

```mermaid
flowchart TD
    Start(["App Launch"]) --> FirstTime{"First time user?"}
    FirstTime -->|Yes| Register["Register"]
    FirstTime -->|No| Login["Login"]

    subgraph Story11["Story 1.1 - User Registration"]
        Register --> AcceptTerms["Accept Terms and Privacy Policy"]
        AcceptTerms --> EmailInput["Email input: validate format + check duplicates"]
        EmailInput --> PasswordInput["Password input: 8+ chars, special characters"]
        PasswordInput --> RegValid{"Valid credentials?"}
        RegValid -->|No| RegError["Error message: show specific requirements"]
        RegError --> EmailInput
        RegValid -->|Yes| EmailVerify["Send email verification link"]
        EmailVerify --> EmailVerified{"Email verified?"}
        EmailVerified -->|No| WaitVerify["Waiting for verification, resend option available"]
        WaitVerify --> EmailVerified
        EmailVerified -->|Yes| ProfileCreation["Profile creation: required fields"]
        ProfileCreation --> BasicInfo["Basic info: name*, phone*, profile photo, DOB (day/month)"]
        BasicInfo --> PersonalDetails["Personal details: interests, location*, cities traveled most"]
        PersonalDetails --> ProfessionalInfo["Professional info: job position, Industry*, Company"]
        ProfessionalInfo --> AllFields{"All required fields complete?"}
        AllFields -->|No| CompleteFields["Complete required fields"]
        CompleteFields --> ProfileCreation
        AllFields -->|Yes| WelcomeScreen["Welcome screen: account created + welcome email"]
    end

    subgraph Story12["Story 1.2 - User Login & Authentication"]
        Login --> LoginFields["Email and password input fields"]
        LoginFields --> LoginValid{"Valid credentials?"}
        LoginValid -->|No| LoginError["Error message: show specific requirements"]
        LoginError --> ForgotPwd{"Forgot password?"}
        ForgotPwd -->|Yes| PwdReset["Password reset: email with secure reset link"]
        ForgotPwd -->|No| LoginFields
        LoginValid -->|Yes| RememberMe{"Remember me?"}
        RememberMe -->|No| DirectLogin["Direct login: session-based auth"]
        RememberMe -->|Yes| RememberToken["Set remember token: 30-day auto-logout"]
    end

    WelcomeScreen --> HomeScreen["Home Screen"]
    PwdReset --> HomeScreen
    DirectLogin --> HomeScreen
    RememberToken --> HomeScreen
    HomeScreen --> Navigation(["Navigation: Explore Map/List, My Pass, Profile settings"])
```

## Story Segments

| Story | Segment in diagram |
|---|---|
| [Story 1.1 - User Registration](../epic-1-user-onboarding-authentication/story-1.1-user-registration.md) | `Register` → `Welcome Screen` (subgraph "Story 1.1") |
| [Story 1.2 - User Login & Authentication](../epic-1-user-onboarding-authentication/story-1.2-user-login-authentication.md) | `Login` → `Remember Token / Direct Login / Password Reset` (subgraph "Story 1.2") |

## Notes from original diagram (not modeled as flow nodes)

- Interests list, list of relevant cities, and "Other" free-input options are annotated on the `Personal details` step.
- Job position/Company free-input and an Industry dropdown list are annotated on the `Professional info` step.
- Near the `Navigation` end node, the original diagram has reference notes for future/related steps that are **not part of this flow**:
  - List of participating locations (top 5 + pictures) — admin-curated, relates to [Story 8.3 - Content Management](../epic-8-admin-support/story-8.3-content-management.md).
  - Map showing NYC + Miami as current locations.
  - Membership selection (Yearly/Monthly plan/Day Pass) — relates to [Story 9.1 - Membership](../epic-9-membership-referrals/story-9.1-membership.md).
  - Full text of [Story 4.2 - Payment Processing](../epic-4-booking-system/story-4.2-payment-processing.md) acceptance criteria is pasted as a documentation note here, but is **not wired into this flow** — see [flow-complete-booking-journey.md](./flow-complete-booking-journey.md) for where payment conceptually belongs in the booking sequence.
