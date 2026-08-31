import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BUSINESS_SUBMISSION_BRANCH_COUNT_MAX,
  BUSINESS_SUBMISSION_BRANCH_COUNT_MIN,
  normalizeRequestedBranchCount,
} from '../src/lib/businessSubmissions'

const formPath = new URL('../src/components/BusinessSubmissionForm.tsx', import.meta.url)
const dataPath = new URL('../src/lib/businessSubmissions.ts', import.meta.url)
const adminUiPath = new URL('../src/components/admin/AdminBusinessSubmissions.tsx', import.meta.url)
const adminCopyPath = new URL('../src/components/admin/adminCopy.ts', import.meta.url)
const searchUiPath = new URL('../src/components/AppDemo.tsx', import.meta.url)
const searchDataPath = new URL('../src/lib/db3a.ts', import.meta.url)
const paginationPath = new URL('../src/lib/clientSearchResults.ts', import.meta.url)
const migrationPath = new URL('../supabase/migrations/20260831000020_business_submission_branch_count.sql', import.meta.url)
const approvalMigrationPath = new URL('../supabase/migrations/20260821000003_db4_maps_location_support.sql', import.meta.url)
const searchMigrationPath = new URL('../supabase/migrations/20260821000005_search_suggestions_and_arabic_support.sql', import.meta.url)

function source(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

describe('business submission branch-count contracts', () => {
  it('defaults empty values to one and accepts only whole numbers from 1 to 20', () => {
    expect(BUSINESS_SUBMISSION_BRANCH_COUNT_MIN).toBe(1)
    expect(BUSINESS_SUBMISSION_BRANCH_COUNT_MAX).toBe(20)
    for (const value of [undefined, null, '', '   ', 1, '1']) {
      expect(normalizeRequestedBranchCount(value)).toBe(1)
    }
    expect(normalizeRequestedBranchCount('2')).toBe(2)
    expect(normalizeRequestedBranchCount(20)).toBe(20)
    for (const value of [0, '0', 21, '21', '2.5', '2e1', -1, Number.NaN, 'branches']) {
      expect(normalizeRequestedBranchCount(value)).toBeNull()
    }
  })

  it('renders the optional bounded field and sends its normalized value in review and WhatsApp summaries', () => {
    const form = source(formPath)

    expect(form).toContain("useState('1')")
    expect(form).toContain('id="requested-branch-count"')
    expect(form).toContain('type="number"')
    expect(form).toContain('min={BUSINESS_SUBMISSION_BRANCH_COUNT_MIN}')
    expect(form).toContain('max={BUSINESS_SUBMISSION_BRANCH_COUNT_MAX}')
    expect(form).toContain('step={1}')
    expect(form).toContain('normalizeRequestedBranchCount(requestedBranchCount)')
    expect(form).toContain('requestedBranchCount: normalizedRequestedBranchCount')
    expect(form.match(/\$\{copy\.branchCount\}:/g)?.length).toBeGreaterThanOrEqual(2)
    expect(form).toContain('{copy.branchCount}</dt>')
  })

  it('provides exact French, Arabic, and English client copy', () => {
    const french = source(new URL('../src/i18n/fr.ts', import.meta.url))
    const arabic = source(new URL('../src/i18n/ar.ts', import.meta.url))
    const english = source(new URL('../src/i18n/en.ts', import.meta.url))

    expect(french).toContain('branchCount: "Nombre d’agences"')
    expect(french).toContain('Si votre établissement a plusieurs agences, indiquez leur nombre.')
    expect(arabic).toContain('branchCount: "عدد الفروع"')
    expect(arabic).toContain('إذا كانت مؤسستك لها عدة فروع، أدخل عددها.')
    expect(english).toContain('branchCount: "Number of branches"')
    expect(english).toContain('If your establishment has multiple branches, enter the number.')
    for (const copy of [french, arabic, english]) {
      expect(copy).toContain('requestedBranchCount:')
    }
  })

  it('uses the unique creation RPC parameter and parses declared plus actual counts', () => {
    const data = source(dataPath)

    expect(data).toContain("supabase.rpc('create_business_submission'")
    expect(data).toContain('p_requested_branch_count: requestedBranchCount')
    expect(data).toContain('requested_branch_count')
    expect(data).toContain('actual_branch_count')
    expect(data).not.toContain('service_role')
    expect(data).not.toContain('.delete(')
  })

  it('adds a forward-only bounded declaration without creating fake branches', () => {
    const migration = source(migrationPath)
    const approval = source(approvalMigrationPath)

    expect(migration).toContain('add column if not exists requested_branch_count integer')
    expect(migration).toContain('alter column requested_branch_count set default 1')
    expect(migration).toContain('alter column requested_branch_count set not null')
    expect(migration).toContain('check (requested_branch_count between 1 and 20)')
    expect(migration).toContain('p_requested_branch_count integer default 1')
    expect(migration).toContain('coalesce(p_requested_branch_count, 1)')
    expect(migration).toContain("'requested_branch_count', v_requested_branch_count")
    expect(migration).toContain("'actual_branch_count'")
    expect(migration).toContain("branch.status = 'active'")
    expect(migration).toContain('limit v_page_size')
    expect(migration).toContain('offset v_offset')
    expect(migration).toContain('revoke all on function public.create_business_submission(text, text, text, text, text, text, numeric, numeric, text, text, uuid, text, text, integer) from public, anon;')
    expect(migration).toContain('grant execute on function public.create_business_submission(text, text, text, text, text, text, numeric, numeric, text, text, uuid, text, text, integer) to authenticated;')
    expect(migration).not.toContain('admin_approve_business_submission')
    expect(migration).not.toContain('insert into public.branches')
    expect(migration).not.toContain('generate_series')
    expect(migration.toLowerCase()).not.toContain('disable row level security')
    expect(migration.toLowerCase()).not.toContain('create policy')
    expect(migration.toLowerCase()).not.toContain('delete from')
    expect(approval).toContain('insert into public.branches')
  })

  it('shows the declared count and warns only while verified active branches are missing', () => {
    const adminUi = source(adminUiPath)
    const copy = source(adminCopyPath)

    expect(adminUi).toContain('submission.requestedBranchCount > 1')
    expect(adminUi).toContain('submission.requestedBranchCount > submission.actualBranchCount')
    expect(adminUi).toContain('subCopy.declaredBranchCount')
    expect(adminUi).toContain('subCopy.branchCountWarning')
    expect(adminUi).toContain('role="note"')
    expect(adminUi).not.toContain('onManageBranches')
    expect(copy).toContain("declaredBranchCount: 'Nombre d’agences déclaré'")
    expect(copy).toContain("declaredBranchCount: 'عدد الفروع المصرّح به'")
    expect(copy).toContain("declaredBranchCount: 'Declared branches'")
  })

  it('shows only real multi-branch choices and keeps one branch folded into the establishment card', () => {
    const searchUi = source(searchUiPath)
    const searchData = source(searchDataPath)
    const searchMigration = source(searchMigrationPath)

    expect(searchUi).toContain('const hasMultipleBranches = establishment.branches.length >= 2;')
    expect(searchUi).toContain(') : hasMultipleBranches ? (')
    expect(searchUi).toContain('{copy.chooseBranch}')
    expect(searchUi).toContain('{establishment.name} — {branch.name}')
    expect(searchUi).toContain('chooseBranch: "Choisissez une agence"')
    expect(searchUi).toContain('chooseBranch: "اختر فرعًا"')
    expect(searchUi).toContain('chooseBranch: "Choose a branch"')
    expect(`${searchUi}\n${searchData}`).not.toContain('requested_branch_count')
    expect(`${searchUi}\n${searchData}`).not.toContain('requestedBranchCount')
    expect(searchMigration).toContain("branch.status = 'active'")
    expect(searchMigration).toContain("update public.wallets\n    set balance = balance - 1")
    expect(searchMigration).toContain('insert into public.credit_ledger')
  })

  it('keeps broad-result pagination at five and does not add another paid-search path', () => {
    const pagination = source(paginationPath)
    const searchData = source(searchDataPath)
    const migration = source(migrationPath)

    expect(pagination).toContain('CLIENT_SEARCH_RESULTS_PER_PAGE = 5')
    expect(searchData.match(/search_services_with_credit/g)).toHaveLength(1)
    expect(migration).not.toContain('search_services_with_credit')
    expect(migration).not.toContain('wallets')
    expect(migration).not.toContain('credit_ledger')
  })
})
