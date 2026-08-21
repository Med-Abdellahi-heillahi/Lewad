# Supabase Migration Repair Command Plan

**Status:** The owner has completed the 15 unique-version metadata repairs. The historical duplicate remains intentionally unmatched.  
**Scope:** metadata repair only. It never runs migration SQL.

## Verified Starting State

The remote project has been independently checked and already contains the current Lewad schema:

- all 11 expected public tables;
- the requested search, request, establishment, recharge, super-admin, and CA-1 read-summary RPCs;
- RLS policies for the public tables;
- the public `avatars` bucket with a 2 MB JPEG/PNG constraint and the intended object policies.

At the start of reconciliation:

- direct SQL inspection found no `supabase_migrations.schema_migrations` table/history;
- `npx supabase migration list` reports all local migrations and no remote migrations;
- two historical local files share the version `20260819000005`.

This is the **manual-schema / missing-history** case. The correct action is to repair only migration metadata for schema effects that have already been verified—not to run SQL again.

### Reconciliation outcome

The owner has now repaired all 15 non-duplicate versions. The final migration list shows Local = Remote for every unique version, while the two local `20260819000005` files remain unmatched by design. No schema or product data changed during the metadata repair.

## Recommended Final Duplicate Strategy

**Choose strategy B for the current repository: controlled archival of the two duplicate historical files outside the active `supabase/migrations/` directory. Pair it with strategy C—a clean baseline—for any future empty environment.**

This is the only strategy that restores ordinary future CLI migration handling without claiming that one history record represents two files. It is a future, owner-approved repository-management change; it is **not** performed by this plan.

Before any file is moved, the owner must:

1. Preserve both files byte-for-byte in Git history and create an archival note containing their paths, SHA-256 hashes, the verified remote effects, the completed 15-version repair list, and the final `migration list` evidence.
2. In an isolated clone/branch only, move copies of the two duplicate files outside the active migration directory and run `npx supabase migration list` against the verified project. The expected result is that all remaining active local versions align with Remote and no duplicate remains in the active list.
3. Review that result and the archive note. The move affects fresh-environment bootstrapping: an empty project can no longer be built from the remaining historical files alone.
4. Before supporting a new empty environment, create and validate a separate clean baseline there. Do not use the archived historical files as a replacement for that baseline.
5. Only after those checks and explicit owner approval, merge the archival move as a documented repository change. Do not alter the current remote database as part of the move.

Until that controlled archival is approved and completed, continue to treat `db push` as unsafe. Strategy A (manual SQL plus metadata repair for every future migration) is only a temporary fallback; it is deliberately not recommended because it keeps the same operational risk indefinitely. Strategy D (marking `20260819000005` once) is rejected: it cannot represent both files and may hide the ambiguity from future operators.

## Local Versions

There are 17 local files but only 16 distinct version values:

| Version | Local file(s) | Repair action |
| --- | --- | --- |
| `20260819000000` | `phase_db1_profiles_wallets_ledger` | Mark applied. |
| `20260819000001` | `phase_db2_categories_establishments_branches` | Mark applied. |
| `20260819000002` | `phase_db3a_secure_search_credit_debit` | Mark applied. |
| `20260819000003` | `phase_db3b_missing_service_requests` | Mark applied. |
| `20260819000004` | `fix_db3b_missing_service_request_rpc` | Mark applied. |
| `20260819000005` | `phase_admin_v1_policies` **and** `profile_phone_unique_and_avatar_storage` | **Do not repair. Document as a manually applied duplicate.** |
| `20260819000006` | `db3a_admin_unlimited_search` | Mark applied. |
| `20260819000007` | `users_crud_v1_admin_rpcs` | Mark applied. |
| `20260820000000` | `admin_create_establishment_rpc` | Mark applied. |
| `20260820000001` | `recharge_requests_admin_approval` | Mark applied. |
| `20260820000002` | `security_2a_recharge_constraints` | Mark applied. |
| `20260820000003` | `create_recharge_request_rpc` | Mark applied. |
| `20260820000004` | `security_2b_medium_hardening` | Mark applied. |
| `20260820000005` | `super_admin_admin_management` | Mark applied. |
| `20260821000000` | `repair_avatar_storage_policies` | Mark applied. |
| `20260821000001` | `ca1_admin_read_summaries` | Mark applied. |

## Owner Preconditions

Before the first repair command, the owner must confirm all of the following in the intended linked project:

1. The schema verification described in [remote-migration-reconciliation-report.md](C:/dev/Lewad/docs/remote-migration-reconciliation-report.md) is retained in the deployment record.
2. The 15 non-duplicate version effects listed below are present remotely.
3. Both `20260819000005` effects are present manually: the admin policy/helper side and the phone/avatar side, including later Security 2B and avatar-repair replacements.
4. The owner accepts the documented residual mismatch for `20260819000005` and understands that this plan repairs metadata only.
5. The project reference/environment is the intended one. Do not use this plan against a preview, staging, or production project by mistake.

`supabase migration repair --status applied <version>` records a migration as applied in migration history **without executing its SQL**. It is still a remote metadata write, so run it only from an owner-controlled session and stop immediately on an unexpected error.

## Completed Owner Metadata Repairs — Do Not Re-run

The owner ran these one at a time from the linked repository root after verifying the current schema. They are retained as an audit record; do **not** re-run them.

```sh
npx supabase migration repair --status applied 20260819000000
npx supabase migration repair --status applied 20260819000001
npx supabase migration repair --status applied 20260819000002
npx supabase migration repair --status applied 20260819000003
npx supabase migration repair --status applied 20260819000004

# Deliberately omitted: 20260819000005 (two local files share this version).

npx supabase migration repair --status applied 20260819000006
npx supabase migration repair --status applied 20260819000007
npx supabase migration repair --status applied 20260820000000
npx supabase migration repair --status applied 20260820000001
npx supabase migration repair --status applied 20260820000002
npx supabase migration repair --status applied 20260820000003
npx supabase migration repair --status applied 20260820000004
npx supabase migration repair --status applied 20260820000005
npx supabase migration repair --status applied 20260821000000
npx supabase migration repair --status applied 20260821000001
```

### Final verification command and observed result

```sh
npx supabase migration list
```

Observed result:

- the 15 repaired local versions show a matching remote version;
- the two local `20260819000005` entries remain the only deliberate unmatched entries;
- no migration SQL has run and no product data has changed.

Save that output alongside the earlier schema verification in the deployment record.

## Duplicate `20260819000005` Strategy

Do **not** run either of these commands:

```sh
npx supabase migration repair --status applied 20260819000005
npx supabase migration repair --status reverted 20260819000005
```

There is one version value but two manually applied historical files. Repairing the same timestamp twice cannot represent two files; repairing it once makes the CLI history look more complete than it is and loses which file was meant.

The safe treatment is:

1. Keep both migration filenames and contents unchanged.
2. Leave the duplicate timestamp absent from CLI history.
3. Record a manual exception in the deployment record containing:
   - both filenames;
   - the remote schema/policy/bucket evidence proving both effects exist;
   - the later migrations that supersede parts of them: `20260820000004_security_2b_medium_hardening.sql` and `20260821000000_repair_avatar_storage_policies.sql`;
   - the final `migration list` output showing the intentional two-entry mismatch.
4. Treat the mismatch as an accepted historical limitation, not an invitation to replay either file.

This is safer than a rename or replay. The historical admin-policy file would restore a removed direct request-update path, and the historical avatar file would restore the broken upload predicate.

## Future Clean-Baseline Strategy

The present project can safely retain this documented exception. If a clean history is needed later, handle it only as a separate, approved migration-management project:

1. Freeze and archive the verified production schema, policy, function, and Storage definitions.
2. Generate/review one new, uniquely-versioned baseline for a **new environment** from that final state—not by renaming or replaying historical files in the current project.
3. Validate the baseline on an empty disposable project, including RLS, avatar upload, secure search debit, recharge approval, and super-admin RPCs.
4. Adopt the baseline only for new environments after owner approval. Keep the current production project on its documented historical exception.

No baseline migration is created by this plan.

## What the Owner May Run

- The read-only verification command:

  ```sh
  npx supabase migration list
  ```

- The read-only SQL evidence checks in [remote-migration-reconciliation-report.md](C:/dev/Lewad/docs/remote-migration-reconciliation-report.md), if a re-check is needed.
- The isolated-clone `migration list` validation required by the recommended archival strategy. It must not be followed by `db push` during that validation.

## What the Owner Must Not Run

```sh
# Do not apply migrations while the duplicate strategy is still an exception.
npx supabase db push

# Never reset a project with real data.
npx supabase db reset

# Never repair the ambiguous duplicate timestamp.
npx supabase migration repair --status applied 20260819000005

# Never mark an unverified version as applied.
npx supabase migration repair --status applied <unverified-version>
```

Also do not rename, delete, edit, squash, or manually replay either historical `20260819000005` file. Do not modify production data while reconciling history.

## Stop Condition

Do **not** run `db push` merely because the 15 unique versions now match. It remains prohibited until the owner explicitly accepts and completes the controlled archival strategy, then validates a future migration procedure that cannot discover or replay the two `20260819000005` files.

## Not Changed

- No source code, migration file, RLS policy, RPC, Storage configuration, remote schema, remote data, or migration-history row was changed by this task.
- No Supabase command was run by this task.
- No migration was created, renamed, deleted, edited, applied, reset, pushed, or repaired.
