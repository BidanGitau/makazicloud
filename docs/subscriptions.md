# Subscription Tiers

MakaziCloud subscription tiers are structured around one reusable plan shape:

- `free`: 30-day trial, full module access, 1 property, 10 units, 1 team member.
- `growth`: 30-day trial, 5 properties, 100 units, 5 team members.
- `scale`: 30-day trial, unlimited properties, unlimited units, unlimited team members.

The API source of truth is `apps/api/src/billing/subscription-plans.ts`.

The web UI uses the matching client-side metadata in `apps/web/app/_lib/subscriptionPlans.js`.

## Organization Fields

Organizations now store:

- `subscription_plan`
- `subscription_status`
- `trial_ends_at`
- `subscription_ends_at`

New signups default to the `free` plan with `subscription_status = trialing` and a 30-day trial end date. During this free trial, the organization can see all modules. Resource limits still apply, so the default free trial can onboard 1 property unless the plan is upgraded.

## Route Access

Private navigation routes now carry both permission and plan metadata in `apps/web/app/_lib/routes.js`.

The private layout checks both:

- user permission, for example `payments:view`
- subscription plan access, for example `growth` or `scale`
This keeps roles and billing separate: a user must have the right role permission and the organization must be on a plan that includes the route.

## Property Limits

The first enforced server-side subscription limit is property onboarding.

`POST /data/properties` checks the organization's subscription plan before creating a property. If the current plan's property limit is reached, the API rejects the request with an upgrade message.

Future limits should be enforced on the API in the same style, then reflected in the web UI for a smoother user experience.
