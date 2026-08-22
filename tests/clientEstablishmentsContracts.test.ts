import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath = new URL('../supabase/migrations/20260821000006_client_owned_establishments.sql', import.meta.url)
const dataLayerPath = new URL('../src/lib/clientEstablishments.ts', import.meta.url)
const profilePath = new URL('../src/components/AppPages.tsx', import.meta.url)
const formPath = new URL('../src/components/BusinessSubmissionForm.tsx', import.meta.url)

function migration() {
  return readFileSync(migrationPath, 'utf8').replaceAll('\r\n', '\n')
}

describe('client-owned establishment contracts', () => {
  it('copies DB4 submitter ownership without changing historical admin ownership', () => {
    const sql = migration()

    expect(sql).toContain('add column if not exists owner_user_id uuid references auth.users (id) on delete set null;')
    expect(sql).toContain('submission.resolved_establishment_id = establishment.id')
    expect(sql).toContain('set owner_user_id = submission.created_by')
    expect(sql).toContain("new.status = 'approved' and new.resolved_establishment_id is not null")
    expect(sql).toContain('set owner_user_id = new.created_by')
  })

  it('exposes only authenticated owners through a read-only RPC', () => {
    const sql = migration()

    expect(sql).toContain('create or replace function public.get_my_establishments_with_stats()')
    expect(sql).toContain('security definer')
    expect(sql).toContain('where establishment.owner_user_id = auth.uid()')
    expect(sql).toContain('grant execute on function public.get_my_establishments_with_stats() to authenticated;')
    expect(sql).toContain("revoke all on function public.get_my_establishments_with_stats() from public, anon;")
    expect(sql).toContain("'branch_count'")
    expect(sql).toContain("'search_appearances', null")
    expect(sql).not.toContain("'admin_note'")
    expect(sql).not.toContain("'audit_log'")
  })

  it('keeps the frontend boundary typed and free of direct table access', () => {
    const source = readFileSync(dataLayerPath, 'utf8')
    expect(source).toContain("supabase.rpc('get_my_establishments_with_stats'")
    expect(source).not.toContain(".from('")
    expect(source).not.toContain('service_role')
  })

  it('adds the profile section and preserves safe initial-only prefill', () => {
    const profile = readFileSync(profilePath, 'utf8')
    const form = readFileSync(formPath, 'utf8')

    expect(profile).toContain('ClientEstablishmentsSection')
    expect(profile).toContain('establishmentsEmpty')
    expect(profile).toContain('item.branchCount')
    expect(profile).not.toContain('item.id}</')
    expect(form).toContain('prefilledUserId')
    expect(form).toContain('setOwnerFirstName((current) => current ||')
    expect(form).toContain('setOwnerLastName((current) => current ||')
    expect(form).toContain('setOwnerPhone((current) => current ||')
  })
})
