import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function migration(name: string) {
  return readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')
}

describe('Supabase security migration contracts', () => {
  it('keeps search debit serialised, wallet-locked, and authenticated-only', () => {
    const sql = migration('20260820000004_security_2b_medium_hardening.sql')

    expect(sql).toContain("pg_advisory_xact_lock(hashtext('search_services_with_credit:' || v_user_id::text))")
    expect(sql).toContain('from public.wallets')
    expect(sql).toContain('for update;')
    expect(sql).toContain("revoke all on function public.search_services_with_credit(text) from public, anon;")
    expect(sql).toContain('grant execute on function public.search_services_with_credit(text) to authenticated;')
  })

  it('keeps recharge approval idempotent and restricted to authenticated administrators', () => {
    const sql = migration('20260820000002_security_2a_recharge_constraints.sql')

    expect(sql).toContain('if not public.is_admin() then')
    expect(sql).toContain("if v_request.status <> 'pending' then")
    expect(sql).toContain('from public.recharge_requests')
    expect(sql).toContain('from public.wallets')
    expect(sql).toContain('for update;')
    expect(sql).toContain("revoke all on function public.admin_approve_recharge_request(uuid) from public, anon;")
    expect(sql).toContain('grant execute on function public.admin_approve_recharge_request(uuid) to authenticated;')
  })

  it('keeps privileged user RPCs protected by active-role checks', () => {
    const sql = migration('20260819000007_users_crud_v1_admin_rpcs.sql')

    expect(sql).toContain("v_caller.status <> 'active' or v_caller.role not in ('admin', 'super_admin')")
    expect(sql).toContain("v_caller.role <> 'super_admin' or v_caller.status <> 'active'")
    expect(sql).toContain("role = 'super_admin'")
  })

  it('allows avatar writes only for an authenticated owner\'s single folder', () => {
    const sql = migration('20260821000000_repair_avatar_storage_policies.sql')

    expect(sql).toContain("bucket_id = 'avatars'")
    expect(sql).toContain("(storage.foldername(name))[1] = (select auth.uid()::text)")
    expect(sql).toContain('coalesce(array_length(storage.foldername(name), 1), 0) = 1')
    expect(sql).toContain('on storage.objects for insert\nto authenticated')
    expect(sql).toContain('on storage.objects for update\nto authenticated')
    expect(sql).toContain('on storage.objects for delete\nto authenticated')
  })
})
