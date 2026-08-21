import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Autocomplete sits next to the paid search, so the risk it introduces is not a
 * broken dropdown — it is a free path that quietly does what a credit is meant
 * to buy. These assertions pin the two properties that keep the two apart: the
 * suggestion RPC writes nothing and spends nothing, and it returns no contact
 * detail. The Arabic assertions pin the matching that made `name_ar` reachable.
 */
const suggestionsPath = new URL('../supabase/migrations/20260821000005_search_suggestions_and_arabic_support.sql', import.meta.url)
const searchDebitPath = new URL('../supabase/migrations/20260820000004_security_2b_medium_hardening.sql', import.meta.url)
const dataLayerPath = new URL('../src/lib/searchSuggestions.ts', import.meta.url)
const searchUiPath = new URL('../src/components/AppDemo.tsx', import.meta.url)

function migration() {
  return readFileSync(suggestionsPath, 'utf8')
}

/** The body of `suggest_services`, isolated from the search function above it. */
function suggestFunction() {
  const sql = migration()
  const start = sql.indexOf('create or replace function public.suggest_services(p_query text)')
  expect(start).toBeGreaterThan(-1)
  return sql.slice(start)
}

describe('search suggestion contracts', () => {
  it('never debits a wallet, writes a ledger entry, or logs a search', () => {
    const sql = suggestFunction()

    // Any of these would turn a keystroke into a paid or recorded event.
    expect(sql).not.toContain('update public.wallets')
    expect(sql).not.toContain('public.credit_ledger')
    expect(sql).not.toContain('insert into public.search_logs')
    expect(sql).not.toContain('for update')
    expect(sql).not.toContain('debited_points')
  })

  it('never returns the contact details a paid search buys', () => {
    const sql = suggestFunction()

    // A suggestion reveals only what a directory listing already shows.
    expect(sql).not.toContain("'phone'")
    expect(sql).not.toContain("'whatsapp'")
    expect(sql).not.toContain("'website'")
    expect(sql).not.toContain("'description'")

    expect(sql).toContain("'name', establishment.name,")
    expect(sql).toContain("'category_name', category.name,")
    expect(sql).toContain("'neighborhood'")
  })

  it('stays bounded, authenticated-only, and escapes wildcards', () => {
    const sql = suggestFunction()

    expect(sql).toContain("return jsonb_build_object('ok', false, 'status', 'unauthenticated', 'items', '[]'::jsonb);")
    expect(sql).toContain('if char_length(v_normalized_query) < 1 or char_length(v_normalized_query) > 80 then')
    expect(sql).toContain('limit 8')
    expect(sql).toContain("where establishment.status = 'approved'")

    // Same escaping as the paid search: a typed query stays literal text.
    expect(sql).toContain("replace(v_normalized_query, E'\\\\', E'\\\\\\\\')")
    expect(sql).toContain("'%', E'\\\\%'")
    expect(sql).toContain("'_', E'\\\\_'")

    expect(sql).toContain('revoke all on function public.suggest_services(text) from public, anon;')
    expect(sql).toContain('grant execute on function public.suggest_services(text) to authenticated;')
  })

  it('keeps the browser boundary read-only and free of contact fields', () => {
    const source = readFileSync(dataLayerPath, 'utf8')

    expect(source).toContain("supabase.rpc('suggest_services'")
    expect(source).not.toContain("supabase.rpc('search_services_with_credit'")
    expect(source).not.toContain('.from(')

    // The exported shape is the contract: a field that does not exist here
    // cannot reach a component, whatever the server later starts returning.
    const shape = source.slice(
      source.indexOf('export type ServiceSuggestion = {'),
      source.indexOf('export type SuggestServicesStatus'),
    )
    expect(shape).toContain('name: string')
    for (const field of ['phone', 'whatsapp', 'website', 'description']) {
      expect(shape).not.toContain(field)
    }

    // Nor may the parser smuggle one through.
    expect(source).not.toContain('item.phone')
    expect(source).not.toContain('item.whatsapp')
    expect(source).not.toContain('item.website')
  })

  it('fills the input on click instead of spending a point', () => {
    const source = readFileSync(searchUiPath, 'utf8')

    // Choosing a suggestion must not run the paid search on the user's behalf.
    expect(source).toContain('const applySuggestion = (suggestion: ServiceSuggestion) => {')
    expect(source).toContain('onClick={() => applySuggestion(suggestion)}')

    const applyBody = source.slice(
      source.indexOf('const applySuggestion'),
      source.indexOf('const acceptDidYouMean'),
    )
    expect(applyBody).not.toContain('runSearch')

    // Typing must not fire one request per keystroke.
    expect(source).toContain('suggestServices(suggestionQuery, controller.signal)')
    expect(source).toContain('}, 220)')
    expect(source).toContain('controller.abort()')

    // The demo catalogue must no longer feed anything the user can act on.
    expect(source).not.toContain('searchDemoEstablishments')
  })
})

describe('Arabic search contracts', () => {
  it('folds Arabic diacritics and interchangeable letter forms', () => {
    const sql = migration()

    expect(sql).toContain('create or replace function public.normalize_arabic_search(p_value text)')
    expect(sql).toContain('immutable')

    // Harakat, superscript alef and tatweel are stripped before comparison.
    expect(sql).toContain("'[\\u064B-\\u065F\\u0670\\u0640]'")
    // Alef variants collapse to bare alef, alef maqsura to ya, ta marbuta to ha.
    expect(sql).toContain("'أإآٱىة',")
    expect(sql).toContain("'اااايه'")
  })

  it('matches the stored Arabic name in the paid search, not only the Latin one', () => {
    const sql = migration()

    // name_ar has existed since 20260820000000 but was unreachable from search.
    expect(sql).toContain("public.normalize_arabic_search(coalesce(establishment.name_ar, '')) like '%' || v_search_pattern || '%'")
    expect(sql).toContain('public.normalize_arabic_search(establishment.name) like')
    expect(sql).toContain("'name_ar', establishment.name_ar,")

    // An exact Arabic name must rank first, like an exact Latin name already does.
    expect(sql).toContain("public.normalize_arabic_search(coalesce(establishment.name_ar, '')) = v_normalized_query")
  })

  it('matches Arabic in suggestions too', () => {
    const sql = suggestFunction()

    expect(sql).toContain('v_normalized_query := public.normalize_arabic_search(v_query);')
    expect(sql).toContain("public.normalize_arabic_search(coalesce(establishment.name_ar, '')) like")
  })

  it('keeps every credit and abuse protection from the superseded search function', () => {
    const sql = migration()
    const previous = readFileSync(searchDebitPath, 'utf8')

    // The rewrite is for matching only. Losing any of these would either give
    // away paid searches or remove the anti-abuse ceiling.
    const preserved = [
      "perform pg_advisory_xact_lock(hashtext('search_services_with_credit:' || v_user_id::text));",
      "and search_log.created_at >= now() - interval '1 minute'",
      'update public.wallets\n    set balance = balance - 1',
      'insert into public.credit_ledger (',
      'insert into public.search_logs (',
      'if char_length(v_normalized_query) < 2 or char_length(v_normalized_query) > 80 then',
      'limit 20',
    ]

    for (const clause of preserved) {
      expect(previous).toContain(clause)
      expect(sql).toContain(clause)
    }

    expect(sql).toContain('revoke all on function public.search_services_with_credit(text) from public, anon;')
    expect(sql).toContain('grant execute on function public.search_services_with_credit(text) to authenticated;')
  })
})
