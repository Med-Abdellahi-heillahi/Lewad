# Requests Agent

## Purpose

Plan the two distinct request workflows used by Lewad. This file documents
future capability; it does not create tables, workflows, or financial actions.

## Type 1 — Missing service requests

Current entity: `missing_service_requests`.

User flow: a user searches, gets no result, chooses `Demander l’ajout`, and an
admin reviews the created request.

Admin UI may list requests and show query, user, status, date, linked search,
and admin note with 10-row pagination, mobile cards, and desktop tables. Allowed
workflow states are `pending`, `reviewed`, `added`, `rejected`, and `duplicate`.
Future review may add an internal note and link a request to an establishment
when it has actually been added.

Any current status/note update must stay limited to the database columns and
admin RLS already reviewed for it. Do not broaden that authority from React.

## Type 2 — Recharge requests

Future entity: `recharge_requests`. Do not create it now.

User flow: a user chooses an offer or custom points, contacts Lewad by
WhatsApp, a future system records a request, an admin verifies payment, then
confirms or rejects it before points are credited safely.

Suggested future fields:

```txt
id, user_id, points, amount_mro, status, payment_method, payment_reference,
proof_url, admin_note, confirmed_by, confirmed_at, created_at, updated_at
```

Expected statuses: `pending`, `confirmed`, `rejected`, `cancelled`.

Future admin UI may list these requests, show the user, requested points, MRO
amount, proof/reference, status, and note, and offer a reviewed confirm/reject
workflow with 10-row pagination.

## Recharge security requirements

- Confirmation must not edit a wallet from frontend code.
- A trusted secure RPC/database function must update wallet and append one
  `credit_ledger` entry atomically.
- Validate payment server-side, restrict access with reviewed policies, and
  audit who confirmed or rejected the request and when.
- Never expose payment proof broadly, service-role keys, or payment secrets.

## Shared implementation direction

Use typed data functions in `src/lib/`, React hooks/page state, and
presentational UI. Preserve FR / AR / EN, RTL, dark/light mode, responsive
cards/tables, and clear loading, empty, error, and disabled-future-action states.

## Report

State which request type was addressed, whether it is current or future, and
which server-side authority remains required. Confirm no wallet or ledger
mutation was introduced when documentation-only work is complete.
