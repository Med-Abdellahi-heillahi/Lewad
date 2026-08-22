import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The DB4 contract spans three migrations. The base migration owns the table,
 * its RLS, and the reject function. The maps migration supersedes the approval
 * function so a submission always carries a map point. The pricing migration
 * supersedes creation, listing, and details so the server owns the 200 MRO /
 * 3-month offer. Each assertion below reads the file that actually owns it.
 */
const basePath = new URL('../supabase/migrations/20260821000002_db4_business_submissions.sql', import.meta.url)
const mapsPath = new URL('../supabase/migrations/20260821000003_db4_maps_location_support.sql', import.meta.url)
const pricingPath = new URL('../supabase/migrations/20260821000004_update_business_submission_amount_200_mro.sql', import.meta.url)
const dataLayerPath = new URL('../src/lib/businessSubmissions.ts', import.meta.url)
const contentPath = new URL('../src/lib/content.ts', import.meta.url)

/** The obsolete signature: no coordinates. It must only ever appear as a `drop`. */
const legacyCreateSignature = 'create_business_submission(text, text, text, text, text, text, text, text, uuid, text, text)'
const createSignature = 'create_business_submission(text, text, text, text, text, text, numeric, numeric, text, text, uuid, text, text)'

function baseMigration() {
  return readFileSync(basePath, 'utf8')
}

function mapsMigration() {
  return readFileSync(mapsPath, 'utf8')
}

function pricingMigration() {
  return readFileSync(pricingPath, 'utf8')
}

describe('DB4 business-submission contracts', () => {
  it('keeps the submitted amount server-owned and fixed at 200 MRO for 3 months', () => {
    const sql = pricingMigration()

    // The creation function is the only place the price and period are decided.
    expect(sql).toContain('v_amount_mro constant integer := 200;')
    expect(sql).toContain('v_period_months constant integer := 3;')
    expect(sql).toContain("'amount_mro', v_amount_mro,")
    expect(sql).toContain("'period_months', v_period_months")

    // The column-level guard backs the function, and the retired 500 MRO value
    // survives only for rows created before the change.
    expect(sql).toContain('drop constraint if exists business_submissions_amount_mro_check;')
    expect(sql).toContain('alter column amount_mro set default 200;')
    expect(sql).toContain('check (amount_mro in (200, 500));')
    expect(sql).toContain('add column if not exists period_months integer not null default 3;')
    expect(sql).toContain('check (period_months = 3);')

    // A price or period argument would let the browser name its own terms.
    expect(sql).not.toContain('p_amount_mro')
    expect(sql).not.toContain('p_period_months')
  })

  it('never lets the retired 500 MRO price reach the current creation path', () => {
    const sql = pricingMigration()

    expect(sql).not.toContain('v_amount_mro constant integer := 500;')

    // Outside comments, 500 may survive only in the legacy-tolerant column
    // constraint and in the column comment that explains why it is tolerated.
    const priceLines = sql
      .split('\n')
      .filter((line) => line.includes('500') && !line.trim().startsWith('--'))
    expect(priceLines.length).toBeGreaterThan(0)
    for (const line of priceLines) {
      expect(line).toMatch(/amount_mro in \(200, 500\)|retired V1 price/)
    }
  })

  it('reports the same published offer in the browser as the migration fixes', () => {
    // The form must quote a price before any server response exists. That
    // display constant drifting from the migration would advertise a price the
    // server then refuses to honour.
    const content = readFileSync(contentPath, 'utf8')
    const sql = pricingMigration()

    expect(content).toContain('export const businessSubmissionOffer = {')
    expect(content).toContain('amountMro: 200,')
    expect(content).toContain('periodMonths: 3,')
    expect(sql).toContain('v_amount_mro constant integer := 200;')
    expect(sql).toContain('v_period_months constant integer := 3;')
  })

  it('shows the stored period to the owner and to the reviewing admin', () => {
    const sql = pricingMigration()

    // Both admin read paths must surface it, or a reviewer cannot see the terms.
    expect(sql).toContain("'period_months', submission.period_months,")
    expect(sql).toContain("'period_months', v_submission.period_months,")

    const source = readFileSync(dataLayerPath, 'utf8')
    expect(source).toContain('const periodMonths = numberValue(value.period_months)')
    // Nullable on purpose: an unapplied pricing migration returns no period, and
    // that must degrade to a hidden row rather than a failed parse.
    expect(source).toContain('periodMonths: number | null')
  })

  it('allows browser roles to read their permitted rows but never write the table directly', () => {
    const sql = baseMigration()

    expect(sql).toContain('alter table public.business_submissions enable row level security;')
    expect(sql).toContain('on public.business_submissions for select')
    expect(sql).toContain('using ((select auth.uid()) = created_by);')
    expect(sql).toContain('using ((select public.is_admin()));')
    expect(sql).toContain('revoke all on public.business_submissions from anon, authenticated;')
    expect(sql).toContain('grant select on public.business_submissions to authenticated;')
    expect(sql).not.toContain('on public.business_submissions for insert')
    expect(sql).not.toContain('on public.business_submissions for update')
    expect(sql).not.toContain('on public.business_submissions for delete')
  })

  it('locks pending reviews, creates a verified establishment atomically, and writes audits', () => {
    const sql = mapsMigration()

    expect(sql).toContain("perform pg_advisory_xact_lock(hashtext('create_business_submission:' || v_user_id::text));")
    expect(sql).toContain('where submission.id = p_submission_id\n  for update;')
    expect(sql).toContain("if v_submission.status <> 'pending_review' then")
    expect(sql).toContain("'approved',\n    true,\n    v_admin_id,\n    now()")
    expect(sql).toContain("'business_submission_approved'")
    expect(sql).toContain("'establishment_id', v_establishment_id")

    // Rejection was not rewritten by the maps migration and stays in the base file.
    expect(baseMigration()).toContain("'business_submission_rejected'")
  })

  it('retires the obsolete coordinate-free creation signature', () => {
    const sql = mapsMigration()

    // The old overload is dropped, not left callable beside the new one: a stale
    // client must not be able to create a submission without a map point.
    expect(sql).toContain('drop function if exists public.create_business_submission(\n  text, text, text, text, text, text, text, text, uuid, text, text\n);')
    expect(sql).not.toContain(`grant execute on function public.${legacyCreateSignature} to authenticated;`)
  })

  it('requires and validates a map point when a submission is created', () => {
    const sql = mapsMigration()

    expect(sql).toContain('p_latitude numeric,')
    expect(sql).toContain('p_longitude numeric,')

    // Absent coordinates are refused outright.
    expect(sql).toContain('if p_latitude is null or p_longitude is null then')
    expect(sql).toContain("'status', 'invalid_coordinates', 'message', 'Select a location on the map.'")

    // Out-of-range and NaN values are refused server-side, never trusted from the client.
    expect(sql).toContain("if p_latitude = 'NaN'::numeric or p_longitude = 'NaN'::numeric")
    expect(sql).toContain('or p_latitude < -90 or p_latitude > 90')
    expect(sql).toContain('or p_longitude < -180 or p_longitude > 180 then')

    // The column-level guard backs the function check.
    expect(sql).toContain('add column if not exists latitude numeric,')
    expect(sql).toContain('add column if not exists longitude numeric;')
    expect(sql).toContain('add constraint business_submissions_coordinates_in_range')
  })

  it('copies the submitted map point into the created main branch on approval', () => {
    const sql = mapsMigration()

    // Approval re-checks the stored point before publishing anything.
    expect(sql).toContain('if v_submission.latitude is null or v_submission.longitude is null')
    expect(sql).toContain("or v_submission.latitude = 'NaN'::numeric or v_submission.longitude = 'NaN'::numeric")

    // Without this the published establishment would never be mappable in search.
    expect(sql).toContain('insert into public.branches (')
    expect(sql).toContain('    latitude,\n    longitude,\n    is_main,\n    status\n  )')
    expect(sql).toContain('    v_submission.latitude,\n    v_submission.longitude,\n    true,\n    \'active\'')

    // The reviewing admin can see the point before deciding.
    expect(sql).toContain("'latitude', v_submission.latitude,")
    expect(sql).toContain("'longitude', v_submission.longitude,")
  })

  it('keeps every business-submission RPC authenticated-only', () => {
    const base = baseMigration()
    const maps = mapsMigration()

    // Each signature is checked against the migration that currently defines it.
    const contracts: { sql: string; signature: string }[] = [
      { sql: maps, signature: createSignature },
      { sql: maps, signature: 'admin_get_business_submission_details(uuid)' },
      { sql: maps, signature: 'admin_approve_business_submission(uuid, text)' },
      { sql: base, signature: 'admin_list_business_submissions(text, text, integer, integer)' },
      { sql: base, signature: 'admin_reject_business_submission(uuid, text, text)' },
    ]

    for (const { sql, signature } of contracts) {
      expect(sql).toContain(`revoke all on function public.${signature} from public, anon;`)
      expect(sql).toContain(`grant execute on function public.${signature} to authenticated;`)
    }
  })

  it('keeps the TypeScript boundary RPC-only and sends the map point but never a price', () => {
    const source = readFileSync(dataLayerPath, 'utf8')

    expect(source).toContain("supabase.rpc('create_business_submission'")
    expect(source).toContain("supabase.rpc('admin_list_business_submissions'")
    expect(source).toContain("supabase.rpc('admin_get_business_submission_details'")
    expect(source).toContain("supabase.rpc('admin_approve_business_submission'")
    expect(source).toContain("supabase.rpc('admin_reject_business_submission'")

    // The data layer must match the coordinate-aware signature, or PostgREST
    // cannot resolve the function at all.
    expect(source).toContain('p_latitude: input.latitude,')
    expect(source).toContain('p_longitude: input.longitude,')

    expect(source).not.toContain(".from('business_submissions')")
    expect(source).not.toContain('p_amount_mro')
  })

  it('keeps technical submission identifiers out of WhatsApp messages', () => {
    const source = readFileSync(new URL('../src/components/BusinessSubmissionForm.tsx', import.meta.url), 'utf8')
    const messageStart = source.indexOf('const submissionWhatsAppHref')
    const messageEnd = source.indexOf('\n  if (formState ===', messageStart)
    const messageBuilder = source.slice(messageStart, messageEnd)

    expect(messageBuilder).not.toContain('submissionId')
    expect(messageBuilder).not.toContain('request_id')
    expect(messageBuilder).not.toContain('UUID')
    for (const field of ['clientName', 'establishmentName', 'establishmentPhone', 'amountSent', 'durationRequested', 'senderPhone', 'bankingApp', 'paymentNumberLabel', 'whatsappThanks']) {
      expect(messageBuilder).toContain(`copy.${field}`)
    }
  })

  it('keeps technical recharge identifiers out of the WhatsApp message', () => {
    const source = readFileSync(new URL('../src/components/AppPages.tsx', import.meta.url), 'utf8')
    const messageStart = source.indexOf('function rechargeWhatsAppUrl')
    const messageEnd = source.indexOf('\n\nfunction RechargePage', messageStart)
    const messageBuilder = source.slice(messageStart, messageEnd)

    expect(messageBuilder).not.toContain('request.id')
    expect(messageBuilder).not.toContain('whatsappRequestId')
    expect(messageBuilder).not.toContain('request_id')
    expect(messageBuilder).not.toContain('UUID')
    for (const field of ['whatsappUserName', 'whatsappPoints', 'whatsappAmount', 'whatsappSenderPhone', 'whatsappBankingApp', 'whatsappPaymentNumber', 'whatsappThanks']) {
      expect(messageBuilder).toContain(`text.${field}`)
    }
  })
})
