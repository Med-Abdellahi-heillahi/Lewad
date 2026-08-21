# Supabase migration-history reconciliation

This runbook resolves SEC-002: the repository contains two historical files
with the `20260819000005` timestamp prefix. Reconcile the intended remote
project's recorded history before applying any new migration.

## Guardrails

- Use the intended production or staging project only after confirming its
  project reference with the project owner.
- Do **not** run `supabase db reset` against production.
- Do **not** rename a migration that may already be applied remotely.
- Do **not** squash historical migrations.
- Do **not** run `supabase db push` before the remote migration history is
  understood and reconciled.
- Never place the access token in source control, terminal transcripts, or
  screenshots.

## Read-only inspection procedure

1. Start from a clean, reviewed checkout and record the current local migration
   filenames. The duplicate historical prefix is expected locally and is not a
   reason to rename either file.

2. Authenticate with a short-lived token supplied through the approved secret
   channel:

   ```sh
   npx supabase login --token <SUPABASE_ACCESS_TOKEN>
   ```

3. Link only the confirmed remote project:

   ```sh
   npx supabase link --project-ref <PROJECT_REF>
   ```

4. Compare the remote history with the local files:

   ```sh
   npx supabase migration list
   ```

5. Save the command output in the deployment ticket or another approved private
   record. Do not paste credentials, database URLs, or service-role keys into
   the record.

## Decision procedure

- If the remote history contains the intended two `20260819000005` migrations,
  stop here: keep both filenames unchanged and record the match.
- If the history differs, stop the deployment. The database owner must identify
  which SQL was actually applied before any repair action is taken.
- Any `supabase migration repair` operation needs explicit owner approval and a
  reviewed, project-specific command. It must correct migration metadata only;
  it must not be used to claim that unapplied SQL has run.
- Only after the history matches the reviewed migration chain may the owner run
  the normal migration-application process for new migrations.

## Exit criteria

The project owner has recorded the confirmed project reference, the output of
`supabase migration list`, the chosen resolution, and the reviewer who approved
it. Until then SEC-002 remains open and the migration chain must be treated as
unverified.
