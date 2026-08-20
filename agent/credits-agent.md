# Credits Agent

## Purpose

Plan the admin view of credits and the **manual recharge workflow**. Wallet
crediting is approved, but only through a secure database function: this agent
never authorises a wallet, ledger, or payment mutation issued from React.

## Entities and admin UI

Entities: `wallets`, `credit_ledger`, and `recharge_requests`.

Admin UI may list wallets, display current balances and total points in
circulation, and show a user's enriched ledger with clearly signed positive and
negative movements. Wallets and ledger use database-backed pagination of 10
rows per page. The credits list shows the account, its balance, its recharge
state, and the actions available on it; detailed financial figures belong in a
per-user view rather than in the list.

A balance of `0` is a real value and must render as `0 points`. Only a missing
wallet row is an absence.

## Manual recharge workflow — approved

The project owner has approved a manual recharge workflow. `recharge_requests`
and its approval functions are part of the design; the earlier instruction not
to create this table no longer applies.

The shape in use:

```txt
id, user_id, offer_label, requested_points, amount_mro, status, admin_note,
approved_by, approved_at, rejected_by, rejected_at, ledger_id,
created_at, updated_at
```

Statuses: `pending`, `approved`, `rejected`, `cancelled`.

A request may only carry a published offer pair — `(requested_points,
amount_mro)` in `(10, 50)`, `(30, 100)`, `(100, 500)`. This is enforced by a
table constraint *and* re-checked at approval time, so a crafted request cannot
buy 10 000 points for nothing.

Flow: from `/recharge`, a user sends only a fixed offer code to the secure
`create_recharge_request` RPC. PostgreSQL resolves the published points/price
pair, records one pending request (or returns the existing pending request),
then the UI opens WhatsApp with the request id. A member of the team approves or
rejects **that exact request**. Approval credits the wallet and writes the
ledger row in one database transaction. Rejection touches neither.

There is still **no payment gateway**. Money changes hands outside the product,
and the WhatsApp handoff on `/recharge` remains informational.

## V1 authority

- Wallet and ledger reads are allowed only within active admin RLS scope.
- Direct balance editing from the frontend is forbidden.
- Direct `credit_ledger` inserts from the frontend are forbidden.
- Crediting a wallet is allowed **only** by approving a stored pending
  `recharge_requests` row through the secure admin RPC.
- Free-form manual adjustments (`admin_adjustment`) still require a separate
  secure RPC, atomic database work, and audit logs. They are not approved yet.

## Security rules

- `wallets.balance` is never editable from React.
- `credit_ledger` is append-only; its history is not rewritten or deleted.
- Users create pending recharge requests only through the fixed-offer creation
  RPC; they do not insert, update, or set the amount of a recharge request
  directly.
- **No arbitrary credit amount input.** The admin UI must never offer a field
  where a team member types a number of points to grant. The only credit path
  is approving a request that already carries its own `requested_points`.
- **Approval uses stored values.** The client sends the request id and nothing
  else. The function reads `requested_points` and `amount_mro` from the locked
  row; a client-supplied amount is never trusted.
- **Only published offer tiers.** The points/price pair is constrained to the
  offers shown on `/recharge`, and revalidated during approval. Changing the
  published offers means changing that constraint deliberately, not loosening it.
- **Normal users cannot approve or reject.** Approval and rejection are
  restricted to an active `admin` or `super_admin`, enforced inside the
  function, not by the UI.
- **A request is approved at most once.** The function locks the request row,
  re-checks that its status is still `pending`, and locks the wallet row, so a
  concurrent second approval cannot credit twice.
- Wallet update, ledger insert, and request status change happen in one
  transaction, or none of them happen.
- Financial totals must be derived from authorised data, never fabricated in UI.
  When a total is computed from a bounded window of rows, say so in the UI
  rather than presenting a partial sum as complete.
- Never expose payment secrets, service-role keys, or customer payment proof.

## Still out of scope

- Any payment gateway, card flow, or automated payment confirmation.
- Crediting a wallet without a stored pending request.
- Editing or deleting ledger history.
- Refunds and reversals — a reversal, when designed, must be a new signed ledger
  movement, never an edit of an existing one.

## Implementation direction

Use typed data functions in `src/lib/`, current-page profile enrichment only,
and mobile cards plus desktop tables. Preserve FR / AR / EN, RTL, theme support,
and explicit loading, empty, unavailable, and error states.

When the recharge table or its functions are not deployed in a given
environment, the data layer detects their absence and the UI says the module is
not connected. It must not fabricate recharge data or surface a raw Postgres
error.

## Report

Separate UI work from server-side authority. State plainly which credit paths
exist, and confirm that no balance or ledger mutation is issued from React.
