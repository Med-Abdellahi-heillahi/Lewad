# Requests Agent

## Purpose

Document the two current request workflows used by Lewad. This contract does
not authorise new tables, policies, payment flows, or financial actions beyond
the reviewed RPCs recorded below.

## Current V1 status — 2026-08-20

Both request workflows are implemented. Users can create missing-service
requests and fixed-offer recharge requests; the operational admin space handles
request review and request-to-service conversion through reviewed RPCs. This
status does not authorise new request types or direct browser writes.

## Type 1 — Missing service requests

Current entity: `missing_service_requests`.

User flow: a user searches, gets no result, chooses `Demander l’ajout`, and an
admin reviews the created request.

The `/admin` requests UI lists query, user, status, date, linked search, admin
note, and resolved establishment with pagination, mobile cards, and desktop
tables. Allowed workflow states are `pending`, `reviewed`, `added`, `rejected`,
and `duplicate`.

Admin may update an allowed status or note through
`admin_update_missing_service_request`, or convert a request to a real service
through `admin_create_establishment`. That secure RPC, for an active admin or
super-admin, creates an establishment with `status = approved` and
`is_verified = true`, creates its main branch with `status = active`, marks the
source request `added`, and links its `resolved_establishment_id`. These values
are intentional: admin-created services must be searchable in `/app`
immediately. Normal users cannot create establishments directly, and React must
not broaden this authority with direct table writes.

## Type 2 — Recharge requests

Current entity: `recharge_requests`.

User flow: from `/recharge`, a user chooses a fixed offer. The UI sends only an
offer code to `create_recharge_request`; PostgreSQL resolves the authorised
points/price pair, creates one `pending` request (or returns the existing
pending request), then the UI opens WhatsApp with the request id. No free-form
points, price, status, or user id comes from the user client.

Current fields:

```txt
id, user_id, offer_label, requested_points, amount_mro, status, admin_note,
approved_by, approved_at, rejected_by, rejected_at, ledger_id,
created_at, updated_at
```

Statuses: `pending`, `approved`, `rejected`, `cancelled`.

An active admin or super-admin can approve or reject a pending request through
the reviewed admin RPCs. Approval locks the request and wallet rows, reads the
stored offer values, credits the wallet, appends one `recharge_credit` ledger
entry, and marks the request approved in one transaction. Rejection changes
neither wallet nor ledger. The same request cannot be approved twice.

## Recharge security requirements

- User creation accepts only server-authorised fixed offers; no custom value or
  direct client insert is allowed.
- Approval must not edit a wallet from frontend code. The trusted secure RPC
  locks the request and wallet, then updates the wallet and appends one
  `credit_ledger` entry atomically.
- Approval/rejection is restricted to an active admin or super-admin inside the
  function; normal users cannot take admin actions.
- There is no payment gateway or automated payment confirmation. Human payment
  validation happens outside the product before approval.
- Never expose payment proof broadly, service-role keys, or payment secrets.

## Shared implementation direction

Use typed data functions in `src/lib/`, React hooks/page state, and
presentational UI. Preserve FR / AR / EN, RTL, dark/light mode, responsive
cards/tables, and clear loading, empty, error, and disabled-future-action states.

## Report

State which request type was addressed and which reviewed RPC authorises it.
Confirm that no direct wallet or ledger mutation was added to React.
