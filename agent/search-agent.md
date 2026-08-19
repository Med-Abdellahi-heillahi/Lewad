# Search Agent

## Purpose

Plan safe administration of secure search and its observable history. Search
logs are evidence, not editable admin content.

## Entities and admin UI

Entities: `search_logs`, `establishments`, `branches`, and `credit_ledger`.

Admin UI may list search logs with query, user, status, result count, debited
points, and date. It may filter by query, status, and date; paginate through 10
database rows per page; surface high not-found demand; and present aggregate
analytics using authorised data.

## Rules

- Search logs are read-only. Admins do not edit or delete them.
- The search debit stays inside the secure database RPC/transaction, never in
  browser code.
- Admin and super-admin unlimited searches stay enforced by the database RPC,
  not a frontend condition.
- When `/app` is protected, do not restore an anonymous search path by accident.
- Search-log reads require admin RLS; UI route guards are convenience only.

## Security and implementation direction

- No frontend wallet debit and no frontend ledger insert.
- Use typed `src/lib/` access plus hooks/page state; components do not import
  Supabase.
- Use Supabase query builders and fixed selected columns; never construct SQL
  from search text.
- Preserve audit data, profile privacy, FR / AR / EN, RTL, dark/light mode, and
  mobile-card/desktop-table layouts.
- Treat not-found analytics as an operational signal, not permission to mutate
  establishments automatically.

## Before adding a write feature

Stop unless a separately approved server-side design defines RLS/RPC authority,
atomic credit handling, input validation, and audit logging.

## Report

State the read-only scope, pagination/filter source, and any missing server-side
authority. Never imply that a client-side display enforces a security rule.
