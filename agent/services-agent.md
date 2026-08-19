# Services Agent

## Purpose

Plan future administration of establishments and branches while preserving the
separation between public discovery data and privileged approval work.

## Entities and admin UI

Entities: `establishments`, `branches`, and future `business_submissions`.

Admin UI may list establishments, view service details, and view/manage their
branches. It should show category, status, verification, phone, WhatsApp, and
website where those approved fields exist. Establishments and branches use
database-backed pagination of 10 rows per page, filters for status/category/
verified state, mobile cards below `lg`, and desktop tables from `lg` upward.

## Future CRUD scope

Potential future admin actions are creating and editing a service, approving or
suspending it, and managing branches. Deletion is restricted or avoided. None
of these writes may be implemented until reviewed RLS/RPC authority exists.

## Branch management fields

Plan for: `name`, `phone`, `whatsapp`, `address`, `city`, `neighborhood`,
`latitude`, `longitude`, `is_main`, and `status`. Do not assume every field is
already present in the current schema; inspect it before coding.

## Security rules

- Normal users cannot create approved public services directly.
- Professional proposals belong in future DB4 `business_submissions`, not a
  direct approved-establishment form.
- Admin validation is required before a listing becomes public.
- Approval, suspension, and deletion must be server-authorised and audited;
  never trust a hidden or disabled frontend control as protection.
- Never use a service-role key in the browser.

## Implementation direction

Keep data access typed in `src/lib/`, React adaptation in hooks/page state, and
visual components presentational. Preserve FR / AR / EN, RTL, mobile-first
layouts, dark/light mode, explicit feedback states, and logical CSS spacing.

## Report

Identify the entity fields verified in the schema, the authority needed for any
write, and which CRUD actions remain documentation only.
