# Credits Agent

## Purpose

Plan the read-only admin view of credits and the future secure recharge flow.
This agent never authorises wallet, ledger, or payment mutations from React.

## Entities and admin UI

Entities: `wallets`, `credit_ledger`, and future `recharge_requests`.

Admin UI may list wallets, display current balances and total points in
circulation, and show a user's enriched ledger with clearly signed positive and
negative movements. Wallets and ledger use database-backed pagination of 10
rows per page. Recharge requests appear only after a real table and approved
workflow exist.

## V1 authority

- Wallet and ledger reads are allowed only within active admin RLS scope.
- Direct balance editing is forbidden.
- Direct `credit_ledger` inserts from the frontend are forbidden.
- Manual adjustments require a future secure RPC, atomic database work, and
  audit logs.
- Recharge confirmation requires a future secure workflow; the existing
  WhatsApp handoff remains informational.

## Future recharge requests

Do not create this table now. A future `recharge_requests` entity may contain:

```txt
id, user_id, points, amount_mro, status, payment_method, proof_url,
admin_note, created_at, updated_at
```

Expected statuses: `pending`, `confirmed`, `rejected`, `cancelled`.

## Security rules

- `wallets.balance` is never editable from React.
- `credit_ledger` is append-only; its history is not rewritten or deleted.
- A confirmed recharge must be validated by backend/RPC and update wallet plus
  ledger atomically under reviewed admin policy.
- Financial totals must be derived from authorised data, never fabricated in UI.
- Never expose payment secrets, service-role keys, or customer payment proof.

## Implementation direction

Use typed data functions in `src/lib/`, current-page profile enrichment only,
and mobile cards plus desktop tables. Preserve FR / AR / EN, RTL, theme support,
and explicit loading, empty, unavailable, and error states.

## Report

Separate read-only UI work from any server-side authority still required. State
plainly that no balance or ledger mutation was added when that remains true.
