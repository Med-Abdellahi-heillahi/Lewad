# DB4 — Business Submissions

**Status:** local implementation only. The migration is **not applied to the remote Supabase project**.

DB4 adds the reviewed backend for `/add-business`. It supports a submitted
business proposal, a manually verified WhatsApp payment handoff, and an
administrator's one-time approval or rejection. It does not add a payment
gateway or a final member/admin interface.

## Data and state model

`public.business_submissions` stores the owner and business contact data, an
optional active category, optional location/website, the required map point
for new submissions (`latitude` and `longitude`), and the server-owned
`amount_mro`. The coordinate columns remain nullable for rows created before
the map contract; the creation RPC rejects a new submission without a valid
pair. The state is one of:

- `pending_review`
- `approved`
- `rejected`
- `cancelled`

The server fixes `amount_mro` at **500 MRO**. The browser cannot supply,
override, or update it. A member can have at most three `pending_review`
submissions at once; PostgreSQL serialises this check per account.

## RPC contracts

The five client-callable contracts are all `SECURITY DEFINER`, pin
`search_path = ''`, revoke `public`/`anon` execution, and grant execution only
to `authenticated`:

| RPC | Caller | Effect |
| --- | --- | --- |
| `create_business_submission` | Authenticated owner | Validates input and a required latitude/longitude pair, resolves `auth.uid()`, fixes 500 MRO, and creates a pending proposal. |
| `admin_list_business_submissions` | Active admin or super admin | Returns a bounded, searchable page and total count. |
| `admin_get_business_submission_details` | Active admin or super admin | Returns one proposal plus a minimal creator summary. |
| `admin_approve_business_submission` | Active admin or super admin | Locks one pending row, requires its valid map point, creates an approved verified establishment and active main branch with its address, nearest place, latitude, and longitude, then links and approves the submission atomically. |
| `admin_reject_business_submission` | Active admin or super admin | Locks one pending row, stores a required rejection reason, and rejects it without creating an establishment. |

Approvals record the approving admin as `establishments.created_by`, as required
for operational attribution. Both decisions add a compact
`admin_audit_events` row. Approval metadata contains the submission ID,
establishment ID, branch ID, French business name, and business phone; rejection
metadata contains the submission ID, name, and phone. No credentials, tokens,
or payment secrets are recorded.

## Browser boundary

`src/lib/businessSubmissions.ts` is the only intended frontend boundary. It
exports typed wrappers for the five RPCs and sends no amount, status, owner ID,
or establishment ID for a new submission. It requires the latitude and
longitude supplied by the location-selection UI. It deliberately has no direct
`.from('business_submissions')` query or mutation.

RLS is enabled on the table:

- an authenticated owner can `SELECT` only rows where `created_by = auth.uid()`;
- an active admin/super admin can `SELECT` all rows;
- `anon` and `authenticated` have no table `INSERT`, `UPDATE`, or `DELETE`
  privileges and no corresponding policies.

This means the browser cannot approve, reject, link, alter the 500 MRO price,
or write another member's proposal by calling PostgREST directly.

## Validation

The creation RPC requires non-empty owner names, French and Arabic business
names (Arabic Unicode block), valid Mauritanian 8-digit phones, a non-null
latitude between -90 and 90, and a non-null longitude between -180 and 180. It
accepts optional WhatsApp, location, nearest-place, and an HTTP(S) website only
after bounds/format validation. An optional category must be currently
`active`.

Approval/rejection accepts an optional maximum 1,000-character admin note.
Rejection additionally requires a non-empty reason of at most 500 characters.
Both actions use `SELECT … FOR UPDATE`; a second decision sees a non-pending row
and does not repeat the action.

## Manual application plan

The repository still has the documented historical duplicate migration version
`20260819000005`. Therefore **do not run `npx supabase db push`** for DB4 and
do not run `db reset`.

After the owner has completed and approved the controlled duplicate archival
strategy in [migration-repair-command-plan.md](./migration-repair-command-plan.md),
the owner may apply DB4 manually in the intended Supabase SQL Editor:

1. Review and run the exact DB4 base SQL in
   `supabase/migrations/20260821000002_db4_business_submissions.sql`.
2. Review and then run
   `supabase/migrations/20260821000003_db4_maps_location_support.sql` after
   the DB4 base migration. These are remote schema changes and need owner
   approval. The map migration adds the coordinate contract without rewriting
   historical migrations or rows.
3. Verify the table, policies, functions, and grants with the read-only checks
   below.
4. Only after the schema effects are verified, record both migration versions
   without
   replaying SQL:

   ```sh
   npx supabase migration repair --status applied 20260821000002
   npx supabase migration repair --status applied 20260821000003
   npx supabase migration list
   ```

`migration repair` writes history only; it does not apply SQL. Do not run it
before the schema verification. Do not repair either historical
`20260819000005` migration.

```sql
-- Read-only post-application verification.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'business_submissions'
order by ordinal_position;

select policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'business_submissions'
order by policyname;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_business_submission',
    'admin_list_business_submissions',
    'admin_get_business_submission_details',
    'admin_approve_business_submission',
    'admin_reject_business_submission'
  )
order by routine_name;
```

## Deliberate boundaries

- No payment gateway, card charge, automatic WhatsApp verification, or wallet/
  credit-ledger change exists in DB4.
- No service-role key is used in frontend code.
- No historical migration was renamed, replayed, or repaired.
- No external map SDK or API key is introduced by this backend contract.
- No admin-review list, approval, or rejection UI is introduced by this backend
  scope.
