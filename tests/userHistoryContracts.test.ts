import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The history page shows a member money-adjacent facts about their own account,
 * so the risks are narrow and specific: it must never write, never widen who can
 * be read, never double-count a search against a member's points, and never leak
 * the internal vocabulary the client has no reason to see.
 *
 * No migration backs this feature. The four source tables already carry
 * owner-scoped SELECT policies, so these assertions also pin the fact that the
 * server — not the browser — is what limits the rows.
 */
const dataLayerPath = new URL('../src/lib/userHistory.ts', import.meta.url)
const pagePath = new URL('../src/components/HistoryPage.tsx', import.meta.url)
const ledgerRlsPath = new URL('../supabase/migrations/20260819000000_phase_db1_profiles_wallets_ledger.sql', import.meta.url)
const searchRlsPath = new URL('../supabase/migrations/20260819000002_phase_db3a_secure_search_credit_debit.sql', import.meta.url)
const rechargeRlsPath = new URL('../supabase/migrations/20260820000001_recharge_requests_admin_approval.sql', import.meta.url)
const rechargeRpcPath = new URL('../supabase/migrations/20260820000003_create_recharge_request_rpc.sql', import.meta.url)
const submissionRlsPath = new URL('../supabase/migrations/20260821000002_db4_business_submissions.sql', import.meta.url)
const localePaths = ['fr', 'ar', 'en'].map(
  (locale) => new URL(`../src/i18n/${locale}.ts`, import.meta.url),
)

function dataLayer() {
  return readFileSync(dataLayerPath, 'utf8')
}

function page() {
  return readFileSync(pagePath, 'utf8')
}

describe('user history contracts', () => {
  it('only ever reads — it never writes, debits, credits, or logs', () => {
    const source = dataLayer()

    // A history view that could mutate would turn "look at what I did" into an
    // action. Every write verb stays out of this module.
    for (const forbidden of ['.insert(', '.update(', '.upsert(', '.delete(', '.rpc(']) {
      expect(source).not.toContain(forbidden)
    }

    // Only the four owner-scoped read sources are touched.
    const tables = source.match(/\.from\('([a-z_]+)'\)/g) ?? []
    const unique = [...new Set(tables)].sort()
    expect(unique).toEqual([
      ".from('business_submissions')",
      ".from('credit_ledger')",
      ".from('recharge_requests')",
      ".from('search_logs')",
    ])
  })

  it('leans on server-side row scoping rather than a client-side user filter', () => {
    // If the browser had to pass its own user id, a tampered client could ask
    // for someone else's history. These policies are what actually prevent it.
    const ownerScoped: [string, string][] = [
      [readFileSync(searchRlsPath, 'utf8'), 'public.search_logs'],
      [readFileSync(ledgerRlsPath, 'utf8'), 'public.credit_ledger'],
      [readFileSync(rechargeRlsPath, 'utf8'), 'public.recharge_requests'],
    ]

    for (const [sql, table] of ownerScoped) {
      expect(sql).toContain(`alter table ${table} enable row level security;`)
      expect(sql).toContain(`on ${table} for select`)
      expect(sql).toContain('using (auth.uid() = user_id);')
    }

    expect(readFileSync(searchRlsPath, 'utf8')).toContain('grant select on public.search_logs to authenticated;')
    expect(readFileSync(ledgerRlsPath, 'utf8')).toContain('grant select on public.credit_ledger to authenticated;')

    // Recharges were granted select+insert originally; the RPC migration took
    // the insert back, so the browser reads its own rows and writes none.
    expect(readFileSync(rechargeRlsPath, 'utf8')).toContain('grant select, insert on public.recharge_requests to authenticated;')
    expect(readFileSync(rechargeRpcPath, 'utf8')).toContain('revoke insert on public.recharge_requests from anon, authenticated;')

    const submissions = readFileSync(submissionRlsPath, 'utf8')
    expect(submissions).toContain('alter table public.business_submissions enable row level security;')
    expect(submissions).toContain('using ((select auth.uid()) = created_by);')
    expect(submissions).toContain('grant select on public.business_submissions to authenticated;')

    // No table write privilege is granted to the browser by any of them.
    expect(submissions).toContain('revoke all on public.business_submissions from anon, authenticated;')
  })

  it('counts a paid search once, not twice', () => {
    const source = dataLayer()

    // A debited search writes both a search_logs row and a search_debit ledger
    // row at the same instant. Showing both would tell the member they spent
    // two points for one search.
    expect(source).toContain(".neq('type', 'search_debit')")
    expect(source).toContain('pointsDelta: -debited')
  })

  it('shows suggestions as nothing at all, because they cost nothing', () => {
    const source = dataLayer()

    // Autocomplete writes no search_logs row and no ledger row, so there is
    // nothing for this module to read. Guard the inverse: history must not
    // start reading a suggestion source and presenting it as activity.
    expect(source).not.toContain('suggest_services')
    expect(source).not.toContain('suggestServices')

    const suggestions = readFileSync(new URL('../src/lib/searchSuggestions.ts', import.meta.url), 'utf8')
    expect(suggestions).not.toContain('insert into')
    expect(suggestions).toContain("supabase.rpc('suggest_services'")
  })

  it('carries the status and the 200 MRO / 3-month terms of a submission', () => {
    const source = dataLayer()

    expect(source).toContain("'business_submission'")
    expect(source).toContain('status: statusValue(row.status)')
    expect(source).toContain('amountMro: numberValue(row.amount_mro)')
    expect(source).toContain('periodMonths: numberValue(row.period_months)')

    // The period column only exists after 20260821000004. Requesting a missing
    // column makes PostgREST reject the whole query, so an unapplied migration
    // must degrade to "no duration shown", not to an empty section.
    expect(source).toContain('period_months')
    expect(source).toContain('if (withPeriod.error)')
  })

  it('renders a loading, empty, and error state', () => {
    const source = page()

    expect(source).toContain('copy.loading')
    expect(source).toContain('copy.empty')
    expect(source).toContain('copy.unavailable')
    expect(source).toContain('copy.refresh')
    expect(source).toContain('<EmptyState')
  })

  it('never puts internal vocabulary in front of the client', () => {
    // Words a non-technical member should never have to read. Checked against
    // the rendered copy and the page, not the source comments.
    const forbidden = [
      'RPC',
      'RLS',
      'search_logs',
      'credit_ledger',
      'recharge_requests',
      'business_submissions',
      'ledger',
      'UUID',
      'schema',
      'backend',
      'policy',
    ]

    for (const path of localePaths) {
      const dictionary = readFileSync(path, 'utf8')
      const block = dictionary.slice(dictionary.indexOf('  history: {'), dictionary.indexOf('  appSearch: {'))
      expect(block.length).toBeGreaterThan(0)

      for (const word of forbidden) {
        expect(block.toLowerCase()).not.toContain(word.toLowerCase())
      }
    }

    // The page must not print a raw record id either: `event.id` carries a
    // `search:`/`credit:` prefix and is a React key only.
    const source = page()
    expect(source).toContain('key={event.id}')
    expect(source).not.toContain('{event.id}<')
  })

  it('is reachable from the member navigation, credits, and profile', () => {
    const nav = readFileSync(new URL('../src/components/shell/appNav.ts', import.meta.url), 'utf8')
    expect(nav).toContain("{ id: 'history', href: '/history', icon: 'clock', secondary: true },")
    // Four bottom tabs is the documented ceiling; history replaces credits.
    expect(nav).toContain("export const appTabIds: AppNavId[] = ['search', 'history', 'recharge', 'profile']")

    const pages = readFileSync(new URL('../src/components/AppPages.tsx', import.meta.url), 'utf8')
    expect(pages).toContain('href="/history"')
    expect(pages).toContain('text.whereMyPoints')

    // The route must resolve, or a refresh on /history would 404 through the
    // SPA fallback into the app's own error page.
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
    expect(app).toContain("path === '/history'")
    expect(app).toContain("route === 'history'")
  })
})
