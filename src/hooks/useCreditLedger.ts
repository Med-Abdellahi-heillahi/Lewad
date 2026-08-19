import { useCallback, useEffect, useRef, useState } from 'react'
import { getMyCreditLedger, type Db1CreditLedgerEntry } from '../lib/db1'
import { DEFAULT_PAGE_SIZE } from '../lib/pagination'

type LedgerState = {
  entries: Db1CreditLedgerEntry[]
  loading: boolean
  error: boolean
  loadedForUserId: string | null
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

const emptyState: LedgerState = {
  entries: [], loading: false, error: false, loadedForUserId: null,
  page: 1, pageSize: DEFAULT_PAGE_SIZE, totalCount: 0, totalPages: 0,
}

export function useCreditLedger(userId: string | undefined, page = 1) {
  const [state, setState] = useState<LedgerState>(emptyState)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const currentRequestId = requestId.current + 1
    requestId.current = currentRequestId

    if (!userId) {
      setState(emptyState)
      return
    }

    setState({ ...emptyState, loading: true, loadedForUserId: userId })
    const ledger = await getMyCreditLedger({ page, pageSize: DEFAULT_PAGE_SIZE })
    if (requestId.current !== currentRequestId) return
    setState({
      entries: ledger.data,
      loading: false,
      error: ledger.error,
      loadedForUserId: userId,
      page: ledger.page,
      pageSize: ledger.pageSize,
      totalCount: ledger.totalCount,
      totalPages: ledger.totalPages,
    })
  }, [page, userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const loading = Boolean(userId) && (state.loading || state.loadedForUserId !== userId || state.page !== page)

  return { ...state, loading, refresh }
}
