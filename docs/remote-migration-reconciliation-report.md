# Remote Supabase Migration Reconciliation Report

**Date:** 2026-08-21  
**Scope:** migration-history and remote-schema verification plan only.  
**Remote mutation performed:** none.

## Confirmed CLI observation

The linked-project command below completed successfully and connected to the remote database:

```sh
npx supabase migration list
```

It returned every local migration with an empty `remote` value. This is now a confirmed observation, not just a reported symptom.

| Local migration entries | Distinct local versions | Remote versions reported | Interpretation |
| ---: | ---: | ---: | --- |
| 17 | 16 | 0 | The remote `supabase_migrations.schema_migrations` history has no version recorded by the CLI. This does **not** prove the schema is empty: SQL may have been applied manually in SQL Editor. |

The remote migration list alone is insufficient to choose a repair. It proves only that migration metadata is absent/empty. The next safe action is the read-only SQL inspection in this report.

## Owner Verification Update — 2026-08-21

The owner completed the read-only verification after this report was created. The remote project contains all requested public tables, key RPCs, public-table RLS policies, the public `avatars` bucket (2 MB; JPEG/PNG), and its read/upload/update/delete policies. Later checks also confirmed the Security 2B removal of the old direct `missing_service_requests` update path and the avatar repair policy that replaces the broken historical predicate.

The owner then repaired migration metadata for the 15 non-duplicate versions. `npx supabase migration list` now aligns Local and Remote for every unique version. The two local `20260819000005` rows intentionally remain unmatched because one history version cannot represent the two historical files.

The current next step is the final duplicate strategy in [migration-repair-command-plan.md](C:/dev/Lewad/docs/migration-repair-command-plan.md): controlled archival outside the active migration directory after isolated-clone validation, plus a clean baseline for any future empty environment. Do not run `db push` while the duplicates remain active.

## Local Migration Inventory and Duplicate Status

The current local directory contains these entries:

| Version | File |
| --- | --- |
| 20260819000000 | `20260819000000_phase_db1_profiles_wallets_ledger.sql` |
| 20260819000001 | `20260819000001_phase_db2_categories_establishments_branches.sql` |
| 20260819000002 | `20260819000002_phase_db3a_secure_search_credit_debit.sql` |
| 20260819000003 | `20260819000003_phase_db3b_missing_service_requests.sql` |
| 20260819000004 | `20260819000004_fix_db3b_missing_service_request_rpc.sql` |
| 20260819000005 | `20260819000005_phase_admin_v1_policies.sql` |
| 20260819000005 | `20260819000005_profile_phone_unique_and_avatar_storage.sql` |
| 20260819000006 | `20260819000006_db3a_admin_unlimited_search.sql` |
| 20260819000007 | `20260819000007_users_crud_v1_admin_rpcs.sql` |
| 20260820000000 | `20260820000000_admin_create_establishment_rpc.sql` |
| 20260820000001 | `20260820000001_recharge_requests_admin_approval.sql` |
| 20260820000002 | `20260820000002_security_2a_recharge_constraints.sql` |
| 20260820000003 | `20260820000003_create_recharge_request_rpc.sql` |
| 20260820000004 | `20260820000004_security_2b_medium_hardening.sql` |
| 20260820000005 | `20260820000005_super_admin_admin_management.sql` |
| 20260821000000 | `20260821000000_repair_avatar_storage_policies.sql` |
| 20260821000001 | `20260821000001_ca1_admin_read_summaries.sql` |

### Historical collision: `20260819000005`

Two files share `20260819000005`. This remains an open reconciliation issue (SEC-002 / MED-001). The version field in Supabase migration history cannot unambiguously represent both files as separate applied migrations.

Do **not** rename either historical file. Do **not** replay either file verbatim:

- Replaying `phase_admin_v1_policies` would restore an old direct `UPDATE` path for `missing_service_requests` that Security 2B deliberately removed.
- Replaying `profile_phone_unique_and_avatar_storage` would restore the broken avatar folder predicate that `20260821000000` corrected.

The existing owner runbook, [med-001-migration-history-owner-action.md](C:/dev/Lewad/docs/med-001-migration-history-owner-action.md), contains the detailed collision analysis. This report supplies the missing full-object inventory needed to determine the live state.

## Read-Only SQL Checks for the Owner

Run the following in the Supabase SQL Editor for the already-confirmed linked project. Each statement is `SELECT`/catalog inspection only; it changes no row, policy, function, bucket, or migration record.

### 1. Migration history (required)

```sql
select *
from supabase_migrations.schema_migrations
order by version;
```

Expected from the CLI observation: zero rows. If the SQL Editor result differs, retain the SQL Editor output as the source of truth and stop before any repair.

For the collision specifically:

```sql
select *
from supabase_migrations.schema_migrations
where version = '20260819000005';
```

### 2. Requested public-table checklist

```sql
with expected_tables(table_name) as (
  values
    ('profiles'),
    ('wallets'),
    ('credit_ledger'),
    ('categories'),
    ('establishments'),
    ('branches'),
    ('search_logs'),
    ('missing_service_requests'),
    ('recharge_requests'),
    ('admin_audit_events'),
    ('admin_invitations')
)
select
  table_name,
  case
    when to_regclass(format('public.%I', table_name)) is not null then 'PRESENT'
    else 'MISSING'
  end as remote_status
from expected_tables
order by table_name;
```

### 3. Avatar Storage bucket checklist

```sql
select
  case when exists (
    select 1
    from storage.buckets
    where id = 'avatars'
  ) then 'PRESENT' else 'MISSING' end as avatars_bucket_status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'avatars';
```

If the result returns no row, the bucket is missing. If it returns a row, retain `public`, `file_size_limit`, and `allowed_mime_types` in the deployment record. The current intended source state is a public-read bucket, a 2 MB limit, and JPEG/PNG only.

### 4. Requested key-RPC checklist

```sql
with expected_functions(function_name) as (
  values
    ('search_services_with_credit'),
    ('create_missing_service_request'),
    ('admin_create_establishment'),
    ('create_recharge_request'),
    ('admin_approve_recharge_request'),
    ('admin_reject_recharge_request'),
    ('super_admin_list_admins'),
    ('super_admin_get_admin_details'),
    ('super_admin_update_admin_profile'),
    ('super_admin_create_admin_invitation'),
    ('super_admin_list_audit_events')
)
select
  expected.function_name,
  case when count(proc.oid) > 0 then 'PRESENT' else 'MISSING' end as remote_status,
  coalesce(
    string_agg(
      format(
        'public.%I(%s) [security_definer=%s]',
        proc.proname,
        pg_get_function_identity_arguments(proc.oid),
        proc.prosecdef
      ),
      E'\n' order by proc.oid::regprocedure::text
    ) filter (where proc.oid is not null),
    '—'
  ) as signatures
from expected_functions as expected
left join pg_namespace as namespace
  on namespace.nspname = 'public'
left join pg_proc as proc
  on proc.pronamespace = namespace.oid
 and proc.proname = expected.function_name
group by expected.function_name
order by expected.function_name;
```

### 5. Extended current-local check (CA-1 migration)

`20260821000001_ca1_admin_read_summaries.sql` is a current local migration in addition to the objects requested above. Check its three read-only contracts too, so a later history repair does not accidentally claim they exist when they do not.

```sql
select
  proc.proname as function_name,
  pg_get_function_identity_arguments(proc.oid) as arguments,
  proc.prosecdef as security_definer,
  proc.proconfig as function_settings
from pg_proc as proc
join pg_namespace as namespace on namespace.oid = proc.pronamespace
where namespace.nspname = 'public'
  and proc.proname in (
    'admin_get_overview_summary',
    'admin_get_analytics_summary',
    'admin_get_recharge_states'
  )
order by proc.proname, arguments;
```

### 6. Optional but recommended shape checks

Presence alone is not proof that a manually created object matches the reviewed migration. Run these read-only checks before any migration history is marked as applied.

```sql
select
  class.relname as table_name,
  class.relrowsecurity as rls_enabled,
  class.relforcerowsecurity as force_rls
from pg_class as class
join pg_namespace as namespace on namespace.oid = class.relnamespace
where namespace.nspname = 'public'
  and class.relname in (
    'profiles', 'wallets', 'credit_ledger', 'categories', 'establishments',
    'branches', 'search_logs', 'missing_service_requests',
    'recharge_requests', 'admin_audit_events', 'admin_invitations'
  )
order by class.relname;
```

```sql
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where (schemaname = 'public' and tablename in (
    'profiles', 'wallets', 'credit_ledger', 'categories', 'establishments',
    'branches', 'search_logs', 'missing_service_requests',
    'recharge_requests', 'admin_audit_events', 'admin_invitations'
  ))
  or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
```

## Initial Schema Objects Checklist (Now Superseded by Owner Verification)

This checklist records the objects that required verification when the report was first created. The later owner verification update above confirms that every listed table, bucket, and RPC is present remotely with the expected final policy/hardening effects. The historical `Unverified` cells below are retained only to show the original verification scope; they are not the current remote status.

| Object | Expected source migration(s) | Remote status now | Owner action |
| --- | --- | --- | --- |
| `public.profiles` | DB1 | Unverified | Read check 2. |
| `public.wallets` | DB1 | Unverified | Read check 2. |
| `public.credit_ledger` | DB1 | Unverified | Read check 2. |
| `public.categories` | DB2 | Unverified | Read check 2. |
| `public.establishments` | DB2 | Unverified | Read check 2. |
| `public.branches` | DB2 | Unverified | Read check 2. |
| `public.search_logs` | DB3A | Unverified | Read check 2. |
| `public.missing_service_requests` | DB3B | Unverified | Read check 2. |
| `public.recharge_requests` | Recharge migrations | Unverified | Read check 2. |
| `public.admin_audit_events` | Security 2B | Unverified | Read check 2. |
| `public.admin_invitations` | Super-admin management | Unverified | Read check 2. |
| `storage.buckets.id = 'avatars'` | Historical profile/avatar + repair | Unverified | Read check 3 and retain settings. |
| `search_services_with_credit` | DB3A + Security 2B final definition | Unverified | Read check 4. |
| `create_missing_service_request` | DB3B + Security 2B final definition | Unverified | Read check 4. |
| `admin_create_establishment` | Admin creation + Security 2B final definition | Unverified | Read check 4. |
| `create_recharge_request` | Recharge creation RPC | Unverified | Read check 4. |
| `admin_approve_recharge_request` | Recharge + Security 2A/2B final definition | Unverified | Read check 4. |
| `admin_reject_recharge_request` | Recharge + Security 2B final definition | Unverified | Read check 4. |
| `super_admin_list_admins` | Super-admin management | Unverified | Read check 4. |
| `super_admin_get_admin_details` | Super-admin management | Unverified | Read check 4. |
| `super_admin_update_admin_profile` | Super-admin management | Unverified | Read check 4. |
| `super_admin_create_admin_invitation` | Super-admin management | Unverified | Read check 4. |
| `super_admin_list_audit_events` | Super-admin management | Unverified | Read check 4. |

## Safe Decision Matrix

| Remote SQL result | Safe classification | Recommended action |
| --- | --- | --- |
| All requested tables, bucket, and key RPCs are missing | A — remote schema empty | Stop. The historical duplicate must be resolved in a separately approved fresh-environment strategy before any `db push`. Under the current no-rename/no-new-migration instruction, do not push or alter files. |
| All requested objects exist and the shape checks match, but history has zero rows | B / D — schema manually applied, history absent | Do **not** run `db push`. Create an owner-approved metadata-reconciliation plan that records exact evidence first, then marks only verified distinct versions as applied. The duplicate needs a documented exception because one history version cannot represent two local files. |
| Some requested objects are missing or shape checks reveal an old definition/policy | C — partial manual schema | Do **not** replay old files. After owner approval, create only new, uniquely versioned, idempotent corrective migration(s) for the missing/current parts. Run preflight checks first, especially for phone normalisation and Storage policies. |
| All objects exist but a later object such as `admin_get_*_summary` is missing | C — partial manual schema | Treat only the missing final contract as a future idempotent corrective migration; do not mark its version applied before it is present. |

## Safest Recommended Next Action

The B/D condition is now confirmed: the reviewed schema exists remotely and the unique-version metadata repair is complete. The remaining issue is not remote schema uncertainty; it is local active-file discovery of the duplicate historical timestamp.

The recommended final strategy is therefore controlled archival of both `20260819000005` files outside active `supabase/migrations/`, but only after a documented archive record and isolated-clone `migration list` validation. A separate clean baseline is required for any future empty environment. The detailed owner sequence is maintained in [migration-repair-command-plan.md](C:/dev/Lewad/docs/migration-repair-command-plan.md).

No `db push` is permitted while both duplicate files remain active.

## Commands the Owner Must Not Run

```sh
# Never run against this linked project during reconciliation.
npx supabase db push
npx supabase db reset

# Never rename, delete, edit, squash, or replay either historical duplicate.
# 20260819000005_phase_admin_v1_policies.sql
# 20260819000005_profile_phone_unique_and_avatar_storage.sql

# Do not use migration repair to claim SQL was applied without schema evidence.
npx supabase migration repair --status applied <unverified-version>
```

Also do not run arbitrary SQL copied from old migrations in SQL Editor, and do not modify production data as part of this investigation.

## Commands the Owner May Run Safely

These commands are read-only with respect to remote schema/data:

```sh
# Already run successfully; safe to re-run and save in the deployment ticket.
npx supabase migration list
```

```sql
-- The SQL Editor SELECT statements in "Read-Only SQL Checks for the Owner".
-- They inspect catalog metadata and do not modify the project.
```

The following command is **not** read-only and is intentionally deferred until the owner approves a reviewed reconciliation manifest:

```sh
npx supabase migration repair --status applied <verified-version>
```

## Not Changed

- No application source, migration, RLS policy, RPC, Storage bucket, remote metadata, or production data was changed.
- No `db push`, `db reset`, `migration repair`, migration rename, migration deletion, or migration creation was performed.
- No secret, database password, service-role key, or access token was printed or stored.
