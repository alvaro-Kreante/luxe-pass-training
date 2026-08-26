# Story 4.2: Payment Processing

## User Story
As a member, I want to pay for my booking securely so that I can complete my reservation.

## Acceptance Criteria
- [ ] Stripe integration for secure payment processing
- [ ] Support for major credit/debit cards
- [ ] Apple Pay and Google Pay integration
- [ ] Payment method storage for future use
- [ ] Subscription pricing display
- [ ] Individual booking pricing for day passes
- [ ] Tax calculation and display
- [ ] Payment confirmation email receipt
- [ ] PCI DSS compliance for data security

## Related Flow
This story has **no dedicated node in any source diagram**. It is only referenced as a text annotation on [flow-onboarding.md](../flows/flow-onboarding.md) (see its Notes section). It conceptually belongs inside the booking sequence in [flow-complete-booking-journey.md](../flows/flow-complete-booking-journey.md), between `Booking summary` and `Terms and cancellation policy` — flag this gap if implementing the payment step.
