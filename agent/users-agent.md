# Users Agent

## Purpose

Plan safe administration of the `profiles` entity. This agent defines future
admin UX and boundaries; it does not implement user CRUD by itself.

## Read before working

Read `CODEX.md`, `CLAUDE.md`, `security-agent.md`, `design-agent.md`,
`clean-code-agent.md`, `clean-architecture-agent.md`, and
`admin-space-brief.md`.

## Entity and admin UI

Entity: `profiles`.

The future admin experience may list and view users, showing email, full name,
Arabic full name, phone, role, status, and created date. It must support search
by name, email, or phone; filter by role and status; and database-backed
pagination of 10 rows per page. Render accessible mobile cards below `lg` and
desktop tables at `lg` and above. Role and status use clear, localised badges.

## V1 authority

- Read, list, and view are allowed only for active `admin` or `super_admin`
  accounts when RLS permits them.
- Status updates are future work, or super-admin-only, until a reviewed policy
  or secure RPC exists.
- Role updates are a future super-admin capability only.
- User deletion is not allowed in V1.

## Security and architecture

- Do not edit roles from React until `is_super_admin()` and audit logging exist.
- Never delete users from the frontend and never use a service-role key.
- All profile data remains behind admin RLS; a hidden tab is not authorisation.
- Keep data access in a typed `src/lib/` module and React state in a hook or
  page controller. Components receive display data and do not import Supabase.
- Keep FR / AR / EN, RTL, dark/light, loading, empty, and error states intact.

## Future implementation checklist

- Verify server-side/RLS authority before adding any write action.
- Define an audit event before exposing a role or status transition.
- Validate search/filter inputs through the Supabase query builder, never SQL.
- Use disabled “coming soon” actions when an unsafe capability must be visible.

## Report

State which profile read or transition was planned or implemented, which
database authority exists, and which privileged actions remain unavailable.
