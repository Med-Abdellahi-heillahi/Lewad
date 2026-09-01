import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { useI18n } from '../../i18n'
import { formatDate, formatNumber } from '../../lib/format'
import {
  CANONICAL_LOCALISATION_FIELDS,
  LocalisationImportError,
  autoMapHeaders,
  chunkRows,
  createEmptyFieldMapping,
  normalizeMappedRows,
  parseLocalisationFile,
  validateMapping,
  type FieldMapping,
  type ParsedLocalisationSheet,
  type ParsedLocalisationWorkbook,
  type RowValidationError,
} from '../../lib/localisationImport'
import {
  applyLocalisationImportBatch,
  createLocalisationImportBatch,
  getLocalisationImportBatchDetails,
  listLocalisationImportBatches,
  localisationImportEntityTypes,
  stageLocalisationImportRows,
  validateLocalisationImportBatch,
  type LocalisationImportApplyResult,
  type LocalisationImportBatch,
  type LocalisationImportBatchDetails,
  type LocalisationImportEntityType,
  type LocalisationImportFailure,
  type LocalisationImportValidationResult,
} from '../../lib/localisationImportApi'
import { btnGhost, btnPrimary, card, field, fieldLabel, pill } from '../../lib/ui'
import { AdminModal, AdminSectionHeader } from '../admin/AdminUi'
import { InlineAlert, LoadingCard } from '../system/States'
import { localisationImportCopy } from './localisationImportCopy'

function failureText(
  copy: (typeof localisationImportCopy)['fr'],
  failure: LocalisationImportFailure | null,
) {
  if (failure === 'not-connected') return copy.notConnected
  if (failure === 'access-denied') return copy.accessDenied
  return copy.unavailable
}

function statusTone(status: string) {
  if (status === 'applied') return 'bg-answer-bg text-answer'
  if (status === 'invalid' || status === 'expired' || status === 'failed') return 'bg-ask-bg text-ask'
  if (status === 'validated') return 'bg-brand-soft text-brand-deep'
  return 'bg-surface-2 text-ink-soft'
}

function cellText(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function SuperAdminLocalisationImport() {
  const { locale } = useI18n()
  const copy = localisationImportCopy[locale]
  const fileInput = useRef<HTMLInputElement>(null)
  const [workbook, setWorkbook] = useState<ParsedLocalisationWorkbook | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<FieldMapping>(() => createEmptyFieldMapping())
  const [entityType, setEntityType] = useState<LocalisationImportEntityType>('establishment')
  const [parsing, setParsing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [stagedRows, setStagedRows] = useState(0)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageSuccess, setPageSuccess] = useState<string | null>(null)
  const [clientRowErrors, setClientRowErrors] = useState<RowValidationError[]>([])
  const [validation, setValidation] = useState<LocalisationImportValidationResult | null>(null)
  const [applyResult, setApplyResult] = useState<LocalisationImportApplyResult | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [details, setDetails] = useState<LocalisationImportBatchDetails | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [history, setHistory] = useState<LocalisationImportBatch[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyFailure, setHistoryFailure] = useState<LocalisationImportFailure | null>(null)

  const sheet: ParsedLocalisationSheet | null = workbook?.sheets[sheetIndex] ?? null
  const mappingValidation = useMemo(
    () => validateMapping(mapping, sheet?.headers),
    [mapping, sheet?.headers],
  )
  const activeValidation = validation?.batchId === activeBatchId ? validation : null
  const activeApplyResult = applyResult?.batchId === activeBatchId ? applyResult : null

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    const result = await listLocalisationImportBatches({ page: 1, pageSize: 20 })
    setHistory(result.data?.data ?? [])
    setHistoryFailure(result.error)
    setHistoryLoading(false)
  }, [])

  const loadDetails = useCallback(async (batchId: string) => {
    const result = await getLocalisationImportBatchDetails(batchId, { page: 1, pageSize: 100 })
    if (result.data) setDetails(result.data)
    else setPageError(failureText(copy, result.error))
  }, [copy])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const resetImportResult = () => {
    setValidation(null)
    setApplyResult(null)
    setActiveBatchId(null)
    setDetails(null)
    setClientRowErrors([])
    setStagedRows(0)
    setPageSuccess(null)
  }

  const chooseSheet = (nextIndex: number, nextWorkbook = workbook) => {
    if (!nextWorkbook?.sheets[nextIndex]) return
    setSheetIndex(nextIndex)
    setMapping(autoMapHeaders(nextWorkbook.sheets[nextIndex].headers, nextWorkbook.sheets[nextIndex].rows))
    resetImportResult()
  }

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setParsing(true)
    setPageError(null)
    setPageSuccess(null)
    try {
      const parsed = await parseLocalisationFile(file)
      setWorkbook(parsed)
      setEntityType('establishment')
      chooseSheet(0, parsed)
    } catch (error) {
      resetImportResult()
      setWorkbook(null)
      setMapping(createEmptyFieldMapping())
      const detail = error instanceof LocalisationImportError ? error.message : copy.parseFailed
      setPageError(`${copy.parseFailed} ${detail}`)
    } finally {
      setParsing(false)
    }
  }

  const updateMapping = (canonicalField: keyof FieldMapping, header: string) => {
    setMapping((current) => ({ ...current, [canonicalField]: header || null }))
    resetImportResult()
  }

  const dryRun = async () => {
    if (!workbook || !sheet) {
      setPageError(copy.noFile)
      return
    }
    if (!mappingValidation.valid) {
      setPageError(copy.mappingMissing)
      return
    }

    let normalized
    try {
      normalized = normalizeMappedRows(sheet, mapping, entityType)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : copy.importFailed)
      return
    }
    setClientRowErrors(normalized.errors)
    if (normalized.errors.length > 0 || normalized.rows.length === 0) {
      setPageError(copy.importFailed)
      return
    }

    setProcessing(true)
    setPageError(null)
    setPageSuccess(null)
    setValidation(null)
    setApplyResult(null)
    setDetails(null)
    setStagedRows(0)

    const created = await createLocalisationImportBatch({
      fileName: workbook.fileName,
      fileType: workbook.fileType,
      sheetName: sheet.name,
      entityType,
      columnMapping: mapping,
      totalRows: normalized.rows.length,
    })
    if (!created.data) {
      setPageError(failureText(copy, created.error))
      setProcessing(false)
      return
    }

    setActiveBatchId(created.data.id)
    for (const rows of chunkRows(normalized.rows)) {
      const staged = await stageLocalisationImportRows(created.data.id, rows)
      if (!staged.data) {
        setPageError(failureText(copy, staged.error))
        setProcessing(false)
        void loadHistory()
        return
      }
      setStagedRows(staged.data.stagedRows)
    }

    const validated = await validateLocalisationImportBatch(created.data.id)
    if (!validated.data) {
      setPageError(failureText(copy, validated.error))
      setProcessing(false)
      void loadHistory()
      return
    }

    setValidation(validated.data)
    setPageSuccess(validated.data.invalidRows === 0 ? copy.noRowErrors : null)
    setProcessing(false)
    await Promise.all([loadDetails(created.data.id), loadHistory()])
  }

  const applyImport = async () => {
    if (!activeBatchId || !activeValidation || activeValidation.invalidRows > 0) return
    setConfirmOpen(false)
    setProcessing(true)
    setPageError(null)
    const result = await applyLocalisationImportBatch(activeBatchId)
    if (!result.data) {
      setPageError(failureText(copy, result.error))
      setProcessing(false)
      return
    }
    setApplyResult(result.data)
    setPageSuccess(copy.importSucceeded)
    setProcessing(false)
    await Promise.all([loadDetails(activeBatchId), loadHistory()])
  }

  const serverErrorRows = details?.rows.filter((row) => row.status === 'invalid') ?? []
  const displayErrorCount = clientRowErrors.length + serverErrorRows.length

  return (
    <div className="space-y-5">
      <header className={`${card} border-brand/45 p-5 sm:p-6`}>
        <AdminSectionHeader icon={FileSpreadsheet} title={copy.title} text={copy.intro} />
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-page-alt px-3.5 py-3 text-xs leading-5 text-muted">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-answer" aria-hidden />
          <p>{copy.securityNote}</p>
        </div>
      </header>

      {pageError && <InlineAlert tone="error" title={copy.importFailed}>{pageError}</InlineAlert>}
      {pageSuccess && <InlineAlert tone="success" title={copy.summaryTitle}>{pageSuccess}</InlineAlert>}

      <section className={`${card} p-5 sm:p-6`}>
        <AdminSectionHeader icon={Upload} title={copy.uploadTitle} text={copy.uploadText} />
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => void onFileChange(event)}
        />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className={btnPrimary} disabled={parsing || processing} onClick={() => fileInput.current?.click()}>
            {parsing ? <LoaderCircle size={17} className="motion-safe:animate-spin" aria-hidden /> : <Upload size={17} aria-hidden />}
            {workbook ? copy.replaceFile : copy.chooseFile}
          </button>
          {workbook && <span dir="auto" className={`${pill} max-w-full truncate bg-surface-2 text-ink-soft`}>{workbook.fileName}</span>}
        </div>
        <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-3">
          <p>{copy.supportedFiles}</p><p>{copy.limits}</p><p>{copy.legacyXls}</p>
        </div>

        {workbook && sheet && (
          <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className={fieldLabel}>{copy.selectSheet}</span>
              <select className={field} value={sheetIndex} onChange={(event) => chooseSheet(Number(event.target.value))}>
                {workbook.sheets.map((item, index) => <option key={`${item.name}-${index}`} value={index}>{item.name} ({item.rows.length})</option>)}
              </select>
            </label>
            <label>
              <span className={fieldLabel}>{copy.entityType}</span>
              <select className={field} value={entityType} onChange={(event) => { setEntityType(event.target.value as LocalisationImportEntityType); resetImportResult() }}>
                {localisationImportEntityTypes.map((type) => <option key={type} value={type}>{copy.entityLabels[type]}</option>)}
              </select>
            </label>
            <div>
              <span className={fieldLabel}>{copy.detectedColumns}</span>
              <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-page-alt p-2">
                {sheet.headers.map((header) => <span key={header} dir="auto" className={`${pill} bg-surface text-ink-soft`}>{header}</span>)}
              </div>
            </div>
          </div>
        )}
      </section>

      {sheet && (
        <section className={`${card} p-5 sm:p-6`}>
          <AdminSectionHeader icon={Database} title={copy.mappingTitle} text={copy.mappingText} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CANONICAL_LOCALISATION_FIELDS.map((canonicalField) => (
              <label key={canonicalField}>
                <span className={fieldLabel}>
                  {copy.fieldLabels[canonicalField]}{' '}
                  <span className="text-xs font-normal text-muted">({canonicalField === 'name' ? copy.required : copy.optional})</span>
                </span>
                <select className={field} value={mapping[canonicalField] ?? ''} onChange={(event) => updateMapping(canonicalField, event.target.value)}>
                  <option value="">{copy.ignoreColumn}</option>
                  {sheet.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>
          {!mappingValidation.valid && (
            <InlineAlert tone="error" title={copy.mappingTitle} className="mt-5">
              {mappingValidation.errors.join(' ')}
            </InlineAlert>
          )}
          {mappingValidation.warnings.length > 0 && (
            <InlineAlert tone="info" className="mt-5">{mappingValidation.warnings.join(' ')}</InlineAlert>
          )}
        </section>
      )}

      {sheet && (
        <section className={`${card} overflow-hidden`}>
          <div className="p-5 sm:p-6">
            <AdminSectionHeader icon={FileSpreadsheet} title={copy.previewTitle} text={copy.previewText} />
            {(sheet.formulaCellCount > 0 || sheet.rejectedFormulaCellCount > 0) && (
              <InlineAlert tone="info" title={copy.formulaWarning} className="mt-4">{copy.formulasIgnored}</InlineAlert>
            )}
          </div>
          {sheet.rows.length === 0 ? (
            <p className="border-t border-line px-5 py-8 text-center text-sm text-muted">{copy.emptyPreview}</p>
          ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="min-w-full text-start text-sm">
                <thead className="bg-page-alt text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{copy.sourceRow}</th>
                    {sheet.headers.map((header) => <th key={header} dir="auto" className="min-w-36 px-4 py-3 text-start font-semibold">{header}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sheet.rows.slice(0, 5).map((row) => (
                    <tr key={row.rowNumber} className="align-top">
                      <td className="tabular px-4 py-3 text-muted">{row.rowNumber}</td>
                      {sheet.headers.map((header) => <td key={header} dir="auto" className="max-w-72 whitespace-normal break-words px-4 py-3 text-ink-soft">{cellText(row.values[header])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-page-alt px-5 py-4">
            <span className="text-xs text-muted">{formatNumber(stagedRows || sheet.rows.length, locale)} / {formatNumber(sheet.rows.length, locale)}</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnGhost} disabled={processing || !mappingValidation.valid || sheet.rows.length === 0} onClick={() => void dryRun()}>
                {processing && !activeValidation ? <LoaderCircle size={17} className="motion-safe:animate-spin" aria-hidden /> : <ShieldCheck size={17} aria-hidden />}
                {processing && !activeValidation ? copy.validating : copy.dryRun}
              </button>
              <button type="button" className={btnPrimary} disabled={processing || !activeValidation || activeValidation.invalidRows > 0 || activeValidation.validRows === 0 || Boolean(activeApplyResult)} onClick={() => setConfirmOpen(true)}>
                {processing && activeValidation ? <LoaderCircle size={17} className="motion-safe:animate-spin" aria-hidden /> : <Database size={17} aria-hidden />}
                {processing && activeValidation ? copy.applying : copy.apply}
              </button>
            </div>
          </div>
        </section>
      )}

      {(activeValidation || activeApplyResult || details || displayErrorCount > 0) && (
        <section className={`${card} p-5 sm:p-6`}>
          <AdminSectionHeader icon={CheckCircle2} title={copy.summaryTitle} />
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              [copy.totalRows, activeValidation?.totalRows ?? details?.batch.totalRows ?? 0],
              [copy.validRows, activeValidation?.validRows ?? details?.batch.validRows ?? 0],
              [copy.invalidRows, activeValidation?.invalidRows ?? details?.batch.invalidRows ?? clientRowErrors.length],
              [copy.duplicateRows, activeValidation?.duplicateRows ?? details?.batch.duplicateRows ?? 0],
              [copy.appliedRows, activeApplyResult ? activeApplyResult.insertedRows + activeApplyResult.updatedRows : details?.batch.appliedRows ?? 0],
              ...(activeApplyResult ? [
                [copy.insertedRows, activeApplyResult.insertedRows],
                [copy.updatedRows, activeApplyResult.updatedRows],
                [copy.skippedRows, activeApplyResult.skippedRows],
              ] : []),
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-line bg-page-alt p-3">
                <p className="tabular text-xl font-bold text-ink">{formatNumber(Number(value), locale)}</p>
                <p className="mt-1 text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink"><AlertTriangle size={16} aria-hidden />{copy.errorRowsTitle}</h3>
            {displayErrorCount === 0 ? <p className="mt-3 text-sm text-muted">{copy.noRowErrors}</p> : (
              <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-line">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-page-alt text-xs text-muted"><tr><th className="px-4 py-3 text-start">{copy.row}</th><th className="px-4 py-3 text-start">{copy.error}</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {clientRowErrors.map((error, index) => <tr key={`client-${error.row_number}-${index}`}><td className="tabular px-4 py-3">{error.row_number}</td><td className="px-4 py-3 text-ask">{error.message}</td></tr>)}
                    {serverErrorRows.flatMap((row) => row.validationErrors.map((error, index) => <tr key={`${row.id}-${index}`}><td className="tabular px-4 py-3">{row.rowNumber}</td><td dir="auto" className="px-4 py-3 text-ask">{error.message || error.code}</td></tr>))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      <section className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
          <AdminSectionHeader icon={Database} title={copy.historyTitle} text={copy.historyText} />
          <button type="button" className={btnGhost} disabled={historyLoading} onClick={() => void loadHistory()}>
            <RefreshCw size={16} className={historyLoading ? 'motion-safe:animate-spin' : ''} aria-hidden />{copy.refresh}
          </button>
        </div>
        {historyLoading ? <div className="border-t border-line p-5"><LoadingCard label={copy.loading} /></div> : historyFailure ? (
          <div className="border-t border-line p-5"><InlineAlert tone="info">{failureText(copy, historyFailure)}</InlineAlert></div>
        ) : history.length === 0 ? <p className="border-t border-line px-5 py-8 text-center text-sm text-muted">{copy.emptyHistory}</p> : (
          <div className="overflow-x-auto border-t border-line">
            <table className="min-w-full text-sm">
              <thead className="bg-page-alt text-xs text-muted"><tr><th className="px-4 py-3 text-start">{copy.file}</th><th className="px-4 py-3 text-start">{copy.sheet}</th><th className="px-4 py-3 text-start">{copy.status}</th><th className="px-4 py-3 text-start">{copy.totalRows}</th><th className="px-4 py-3 text-start">{copy.createdAt}</th></tr></thead>
              <tbody className="divide-y divide-line">
                {history.map((batch) => (
                  <tr key={batch.id} className={activeBatchId === batch.id ? 'bg-page-alt' : 'hover:bg-page-alt'}>
                    <td className="max-w-72 break-words px-4 py-3 font-medium text-ink">
                      <button
                        type="button"
                        dir="auto"
                        className="text-start underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        disabled={processing}
                        onClick={() => {
                          setActiveBatchId(batch.id)
                          setClientRowErrors([])
                          setPageError(null)
                          setPageSuccess(null)
                          setDetails(null)
                          void loadDetails(batch.id)
                        }}
                      >
                        {batch.fileName}
                      </button>
                    </td>
                    <td dir="auto" className="px-4 py-3 text-ink-soft">{batch.sheetName ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`${pill} ${statusTone(batch.status)}`}>{copy.statuses[batch.status] ?? batch.status}</span></td>
                    <td className="tabular px-4 py-3 text-ink-soft">{formatNumber(batch.totalRows, locale)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(batch.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirmOpen && (
        <AdminModal title={copy.confirmTitle} subtitle={copy.confirmWarning} closeLabel={copy.close} closeDisabled={processing} onClose={() => setConfirmOpen(false)}>
          <InlineAlert tone="info" title={copy.confirmTitle} className="mt-5">{copy.confirmWarning}</InlineAlert>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={btnGhost} disabled={processing} onClick={() => setConfirmOpen(false)}>{copy.cancel}</button>
            <button type="button" className={btnPrimary} disabled={processing} onClick={() => void applyImport()}>
              <Database size={17} aria-hidden />{copy.apply}
            </button>
          </div>
        </AdminModal>
      )}
    </div>
  )
}
