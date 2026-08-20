# Services Agent

## Purpose

Document the current administration of establishments and branches while
preserving the separation between public discovery data and privileged approval
work.

## Current V1 status — 2026-08-20

`/admin` provides operational establishment creation and services views. The
implemented `admin_create_establishment` RPC may also resolve a missing-service
request; the created approved establishment and active main branch are
searchable in `/app` immediately. This does not authorise generic editing,
deletion, or normal-user creation.

## Entities and admin UI

Entities: `establishments`, `branches`, and future `business_submissions`.

The `/admin` services interface lists establishments and service details with
their available branch data. It preserves category, status, verification, phone,
WhatsApp, and website fields where present, with database-backed pagination,
filters, mobile cards below `lg`, and desktop tables from `lg` upward.

## Approved creation scope

`admin_create_establishment` is the approved, RPC-only V1 creation path. An
active admin or super-admin may create an establishment and its main branch;
the browser calls the typed `src/lib/` wrapper and never inserts directly into
`establishments` or `branches`.

The RPC intentionally creates:

- an establishment with `status = approved` and `is_verified = true`;
- a main branch with `status = active`.

This makes admin-created services searchable in `/app` immediately. When the
creation comes from a missing-service request, the same reviewed flow can mark
the request `added` and link `resolved_establishment_id` to the new
establishment.

Editing, suspension, branch management beyond the main branch, and deletion
remain separate work. Do not infer authority for them from the approved creation
RPC.

## Branch management fields

Plan for: `name`, `phone`, `whatsapp`, `address`, `city`, `neighborhood`,
`latitude`, `longitude`, `is_main`, and `status`. Do not assume every field is
already present in the current schema; inspect it before coding.

## Security rules

- Normal users cannot create establishments or approved public services
  directly.
- Professional proposals belong in future DB4 `business_submissions`, not a
  direct approved-establishment form.
- The approved creation RPC performs the current admin validation; its approved
  and verified status is intentional, not a browser decision.
- Any future approval, suspension, editing, or deletion must be
  server-authorised and audited; never trust a hidden or disabled frontend
  control as protection.
- Never use a service-role key in the browser.

## Implementation direction

Keep data access typed in `src/lib/`, React adaptation in hooks/page state, and
visual components presentational. Preserve FR / AR / EN, RTL, mobile-first
layouts, dark/light mode, explicit feedback states, and logical CSS spacing.

## Report

Identify the entity fields verified in the schema, the approved creation RPC,
and which CRUD actions still need separate authority.
