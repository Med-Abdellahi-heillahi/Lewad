import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const formPath = new URL('../src/components/admin/AdminAddEstablishmentForm.tsx', import.meta.url)
const adminPath = new URL('../src/lib/admin.ts', import.meta.url)
const copyPath = new URL('../src/components/admin/adminCopy.ts', import.meta.url)
const migrationPath = new URL('../supabase/migrations/20260821000008_establishment_type_admin_flow.sql', import.meta.url)

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

describe('admin establishment type contracts', () => {
  it('asks for the type before rendering the creation fields', () => {
    const source = read(formPath)
    expect(source).toContain('typeQuestion')
    expect(source).toContain("type === 'private' ? required : required.filter")
    expect(source).toContain("name === 'location'")
    expect(source).toContain("type === 'private' || name === 'image' || name === 'location'")
  })

  it('keeps private requirements and simplifies public/admin payloads', () => {
    const source = read(formPath)
    expect(source).toContain('isRequiredArabicName')
    expect(source).toContain('isValidMauritanianPhone')
    expect(source).toContain("type === 'private' ? draft.nameAr.trim() : ''")
    expect(source).toContain("type === 'private' ? normalizeMauritanianPhone(draft.phone) : ''")
    expect(source).toContain('establishmentType: type')
    expect(source).toContain("type === 'private' || name === 'image' || name === 'location'")
  })

  it('defines localized type labels in the admin copy', () => {
    const source = read(copyPath)
    for (const value of ['typeQuestion', 'typePrivate', 'typePublic', 'typeAdministrative', 'typeHelp', 'locationRequired']) {
      expect(source).toContain(`${value}:`)
    }
    expect(source).toContain('Privé')
    expect(source).toContain('خاص')
    expect(source).toContain('Administrative')
  })

  it('constrains and authorizes the new server-side type path', () => {
    const sql = read(migrationPath)
    const admin = read(adminPath)
    expect(sql).toContain("add column if not exists establishment_type text not null default 'private';")
    expect(sql).toContain("check (establishment_type in ('private', 'public', 'administrative'))")
    expect(sql).toContain('p_establishment_type text')
    expect(sql).toContain("if v_admin_id is null or not public.is_admin() then")
    expect(sql).toContain("v_type not in ('private', 'public', 'administrative')")
    expect(sql).toContain("if v_type = 'private' then")
    expect(sql).toContain("if v_type = 'public' or v_type = 'administrative' then")
    expect(sql).toContain('grant execute on function public.admin_create_establishment')
    expect(admin).toContain('establishmentType?: AdminEstablishmentType')
    expect(admin).toContain('p_establishment_type: params.establishmentType ?? \'private\'')
    expect(admin).not.toContain('service_role')
  })
})
