# MED-001 / SEC-002 Migration History Reconciliation

**Status:** Open — blocked on owner action
**Type:** Diagnostic and documentation only. No migration was renamed, edited, or applied.
**Related:** [`docs/full-project-vulnerability-report.md`](./full-project-vulnerability-report.md) (MED-001) · [`docs/security-audit-lewad.md`](./security-audit-lewad.md) (SEC-002) · [`docs/migration-history-reconciliation.md`](./migration-history-reconciliation.md) (general runbook)

---

## Summary

Two local migrations share the version prefix `20260819000005`. Supabase records applied migrations in `supabase_migrations.schema_migrations`, where **`version` is the primary key** — so at most **one** row can ever carry version `20260819000005`. Two files therefore cannot both be recorded, whatever happened at deploy time.

The consequence is that the deployed project may be missing the admin RLS policies, or the profile phone normalisation and avatar Storage policies, with no way to tell from the repository alone.

### The finding that changes the recommended action

Both files are individually idempotent, so the obvious repair — "replay whichever file is missing" — looks safe. **It is not.** Later migrations deliberately superseded parts of both:

| Replaying | Undoes | Effect |
|---|---|---|
| `…_phase_admin_v1_policies.sql` | `20260820000004_security_2b_medium_hardening.sql:398-399` | Re-grants the direct `UPDATE` on `missing_service_requests` and recreates the legacy review policy — **reopens SEC-006**, restoring a second, unaudited write path around the locked RPC |
| `…_profile_phone_unique_and_avatar_storage.sql` | `20260821000000_repair_avatar_storage_policies.sql` | Restores the broken `storage.foldername(name)[2]` INSERT predicate and re-adds `image/webp` — **avatar upload stops working again**, because `foldername` never returns a second segment for a one-directory path |

So the corrective migration must contain **only the parts that are still current**, never a verbatim replay. This is spelled out per case in the decision matrix.

---

## Why This Is Owner Action

- The remote Supabase project, its migration history, and its live RLS/Storage state are **not reachable from the repository or this workspace**. Nothing here can prove what is deployed.
- Renaming a migration that may already be applied can cause the CLI to replay it, which — per the table above — would actively regress security and break avatar upload.
- Reading `supabase_migrations.schema_migrations` requires authenticated access to the project.
- `supabase migration repair` rewrites deployment metadata. It must be run only with explicit owner approval, and only to correct metadata — never to claim that unapplied SQL has run.

---

## Local Duplicate Migrations

| Version | File | Purpose | Risk if Missing |
|---|---|---|---|
| `20260819000005` | `_phase_admin_v1_policies.sql` | Creates `public.is_admin()`; adds admin `SELECT` policies to 8 tables (`profiles`, `wallets`, `credit_ledger`, `search_logs`, `missing_service_requests`, `categories`, `establishments`, `branches`); adds the column-scoped request-review `UPDATE` grant and policy | **High.** Without it, `is_admin()` does not exist, so every later migration and RPC that calls it fails, and `/admin` and `/super-admin` read nothing. In practice a missing `is_admin()` would have broken the later migrations, which is itself a useful diagnostic signal |
| `20260819000005` | `_profile_phone_unique_and_avatar_storage.sql` | Adds `profiles.phone_normalized`; creates `normalize_profile_phone()` and the `set_profile_phone_normalized` trigger; backfills and enforces a partial unique index on active phones; creates the public `avatars` bucket and its four `storage.objects` policies | **High.** Without it, phone uniqueness is unenforced (duplicate accounts per number), and the `avatars` bucket and its policies do not exist, so avatar upload fails. `super_admin_update_admin_profile` and `super_admin_create_admin_invitation` also call `normalize_profile_phone()` and would error |

### Idempotency assessment

| File | Verdict | Detail |
|---|---|---|
| `_phase_admin_v1_policies.sql` | **Idempotent** | `create or replace function`, `drop policy if exists` before every `create policy`, and re-issued `grant`/`revoke`. Re-running produces the same end state — but see the replay hazard above |
| `_profile_phone_unique_and_avatar_storage.sql` | **Idempotent, with one abort condition** | `add column if not exists`, `create or replace function`, `drop trigger if exists`, `create unique index if not exists`, `insert … on conflict do update`, `drop policy if exists` before each `create policy`. The backfill `UPDATE` is guarded by `is distinct from`, so a re-run is a no-op. **However**, the `do $$ … $$` block raises `23505` and aborts if two non-deleted profiles normalise to the same phone. That is a deliberate safety stop, not a failure to fix blindly — resolve the duplicates first (preflight query is in the file header, lines 8-23) |

Neither file is destructive. Neither drops a table, deletes rows, or revokes access that a later migration depends on.

---

## Commands for Owner

Run from the repository root, on a clean checkout. **Read-only** — none of these change the remote project.

```bash
# 1. Authenticate with a short-lived token from the approved secret channel.
#    Never paste the token into a commit, ticket, screenshot, or chat log.
npx supabase login --token <SUPABASE_ACCESS_TOKEN>

# 2. Link the confirmed project. See the confirmation note below before running.
npx supabase link --project-ref mfdsvcpdlqzciwnszbak

# 3. Compare recorded remote history against local migration files.
npx supabase migration list
```

**Confirm the project ref first.** `mfdsvcpdlqzciwnszbak` is taken from the task request, not from this repository — there is no `supabase/config.toml`, so no local link exists. Verify it matches the host in `VITE_SUPABASE_URL` in your `.env.local` (`https://<PROJECT_REF>.supabase.co`) and that it is the intended environment. Linking the wrong project and then pushing is the main way this task could cause damage.

Record the full `migration list` output in the deployment ticket. Do not include credentials, database URLs, or service-role keys in that record.

---

## SQL Checks

Run in the Supabase SQL Editor for the confirmed project. All are read-only.

### 1. Which file is recorded for the duplicate version?

```sql
select version, name, inserted_at
from supabase_migrations.schema_migrations
where version = '20260819000005'
order by inserted_at;
```

Fallback if `name` does not exist in this Supabase version:

```sql
select *
from supabase_migrations.schema_migrations
where version = '20260819000005';
```

The `name` column holds the part of the filename after the version, so it is the single most useful field here — it tells you which of the two files the history believes it applied. Expect **zero or one** row, never two.

### 2. Full recorded history, for context

```sql
select version, name, inserted_at
from supabase_migrations.schema_migrations
order by version;
```

Compare this against `ls supabase/migrations/`. Note whether the later migrations (`20260820000004`, `20260820000005`, `20260821000000`) are recorded — if they are, `is_admin()` must exist, because they call it.

### 3. Live state — admin RLS policies (File A)

```sql
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'wallets', 'credit_ledger', 'categories',
    'establishments', 'branches', 'search_logs', 'missing_service_requests'
  )
order by tablename, policyname;
```

Expect one `Admins can read all …` `SELECT` policy per table. Also confirm the helper exists:

```sql
select proname, prosecdef, proconfig
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_admin', 'is_super_admin', 'normalize_profile_phone');
```

`prosecdef` should be `true` for `is_admin`/`is_super_admin`, and `proconfig` should pin `search_path`.

### 4. Live state — profile phone (File B)

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;
```

Expect a `phone_normalized` column.

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'profiles'
  and indexdef ilike '%phone%';
```

Expect `profiles_active_phone_normalized_uidx`.

```sql
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.profiles'::regclass and not tgisinternal;
```

Expect `profiles_set_phone_normalized`.

### 5. Live state — avatar Storage (File B, as amended by the repair migration)

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'avatars';
```

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

**How to read the result** — this distinguishes the historical migration from the repair:

| Observation | Meaning |
|---|---|
| No `avatars` bucket row | File B never ran |
| `allowed_mime_types` includes `image/webp` | File B ran, repair migration (`20260821000000`) did **not** |
| `allowed_mime_types` is exactly `{image/jpeg,image/png}` | Repair migration ran |
| Upload policy references `foldername(name))[2]` | Historical (broken) predicate still live — uploads are rejected |
| Upload policy references `array_length(storage.foldername(name), 1) = 1` | Repaired predicate is live |

### 6. Duplicate-phone preflight (only if File B is missing)

Run the preflight query in the header of `20260819000005_profile_phone_unique_and_avatar_storage.sql` (lines 8-23) **before** any corrective migration that creates the unique index. If it returns rows, resolve those duplicates first; the migration is designed to abort rather than silently reassign another user's phone number.

---

## Decision Matrix

Determine the case from SQL check 1 (history) **and** checks 3–5 (live state). They are independent: SQL may have been applied by hand in the SQL Editor without a history row, or a history row may exist for SQL that partly failed.

| Case | History row for `20260819000005` | Live state | Recommended action |
|---|---|---|---|
| **A** | None | Neither File A nor File B objects present | Nothing is deployed for this version. Before applying to this or a fresh environment, give one of the two files a unique later version so both can be recorded. Do **not** apply both files at the same duplicate version |
| **B** | Present, `name` = `phase_admin_v1_policies` | Admin policies present; `phone_normalized` / `avatars` bucket **absent** | Do **not** rename the applied migration. Create one new uniquely-versioned corrective migration carrying **File B's content as amended by `20260821000000`** — that is, the phone column/function/trigger/index plus the **repaired** avatar policies and the `{jpeg,png}` MIME list. Never copy File B verbatim |
| **C** | Present, `name` = `profile_phone_unique_and_avatar_storage` | Phone/avatar present; admin policies **absent** | Do **not** rename the applied migration. Create one new uniquely-versioned corrective migration carrying **File A's content minus the `missing_service_requests` UPDATE grant and review policy** — those were deliberately removed by `20260820000004`. Include `is_admin()` and the 8 admin `SELECT` policies only |
| **D** | Present, but `name` is absent/ambiguous | Unknown | Use checks 3–5 to establish what is actually live, then treat it as B, C or E. The `allowed_mime_types` and upload-policy predicate in check 5 are the clearest discriminators |
| **E** | Present (either name) | **Both** File A and File B objects present and current | Both effects reached the database despite one history row. Document it, keep both filenames unchanged, and record that the history is under-counted by one. Plan a clean baseline for future environments rather than a rename |
| **F** | None | Objects present anyway | SQL was applied outside the CLI. The schema is fine; the history is not. This is the one case where `supabase migration repair --status applied <version>` is appropriate — metadata only, with owner approval, after confirming the schema really matches |

In **every** case where a corrective migration is needed (B, C, D), the same three rules apply:

1. Use a new unique version later than `20260821000000`.
2. Include only what is **currently intended**, reconciled against every later migration — not a verbatim copy of the historical file.
3. Keep it idempotent (`if not exists`, `create or replace`, `drop policy if exists`) so a partial prior state converges safely.

---

## Recommended Safe Path

1. Confirm the project ref against `VITE_SUPABASE_URL`.
2. Run `npx supabase migration list` and SQL check 1. Save both outputs to the deployment ticket.
3. Run SQL checks 3–5 to establish live state independently of the history.
4. Identify the case from the matrix.
5. If a corrective migration is needed, have it drafted **against the current intended state**, reviewed, and approved before applying — as a separate, explicitly authorised task.
6. Re-run checks 3–5 after applying, and record the result.
7. Only then close MED-001 / SEC-002 and update both audit documents.

---

## What Not To Do

- Do **not** rename either `20260819000005` file before the history is known. If the version is recorded, a rename makes the CLI treat it as new and replay it — with the regressions listed at the top of this document.
- Do **not** replay either file verbatim as a repair. Both have been partly superseded.
- Do **not** run `supabase db reset` against a project holding real data.
- Do **not** run `supabase db push` before the history is reconciled.
- Do **not** use `supabase migration repair` to mark unapplied SQL as applied. It corrects metadata; it does not run SQL.
- Do **not** squash or edit historical migrations.
- Do **not** resolve a duplicate-phone abort by deleting or reassigning a user's phone number without owner sign-off.
- Do **not** place the access token in source control, a ticket, or a screenshot.

---

## Current Status

- Both duplicate files remain unchanged in `supabase/migrations/`.
- No migration was renamed, edited, applied, or created during this task.
- The remote project was not contacted; no Supabase credential was used.
- MED-001 / SEC-002 remains **open**, and the migration chain must continue to be treated as unverified.
- Everything stated about the live database in the audit reports is inferred from migration **source**, not confirmed deployment state. That caveat stands until this reconciliation is done.

---

## Next Action Required From Owner

1. Confirm the intended project reference.
2. Run the three CLI commands and SQL checks 1–5.
3. Record the outputs and the resulting case (A–F) in the deployment ticket.
4. Authorise a follow-up task to draft the corrective migration if the case is B, C or D.

Until step 3 is recorded, no further migration should be pushed to the remote project.
