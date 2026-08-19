import { useCallback, useEffect, useRef, useState } from 'react'
import { getMyAccountSummary, type Db1Profile, type Db1Wallet } from '../lib/db1'

type AccountState = {
  profile: Db1Profile | null
  wallet: Db1Wallet | null
  loading: boolean
  profileError: boolean
  walletError: boolean
  error: boolean
  loadedForUserId: string | null
}

const emptyState: AccountState = { profile: null, wallet: null, loading: false, profileError: false, walletError: false, error: false, loadedForUserId: null }

export function useDb1Account(userId: string | undefined) {
  const [state, setState] = useState<AccountState>(emptyState)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const currentRequestId = requestId.current + 1
    requestId.current = currentRequestId

    if (!userId) {
      setState(emptyState)
      return
    }

    // A background refresh must not make a known balance disappear. A new
    // session still starts from an empty state, so account data never leaks
    // between users.
    setState((current) => (
      current.loadedForUserId === userId
        ? { ...current, loading: true, profileError: false, walletError: false, error: false }
        : { ...emptyState, loading: true, loadedForUserId: userId }
    ))
    const account = await getMyAccountSummary(userId)
    if (requestId.current !== currentRequestId) return
    setState({ ...account, loading: false, loadedForUserId: userId })
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /**
   * DB3A returns the authoritative balance from its atomic debit. Applying it
   * here updates every consumer of AccountProvider immediately; `refresh()`
   * then reconciles it with `public.wallets` in the background.
   */
  const applyWalletBalance = useCallback((balance: number) => {
    if (!userId || !Number.isFinite(balance)) return

    setState((current) => {
      if (current.loadedForUserId !== userId || !current.wallet) return current

      return {
        ...current,
        wallet: { ...current.wallet, balance },
        walletError: false,
      }
    })
  }, [userId])

  // A new Auth session renders before effects start. Until its first account
  // request has completed, it is loading — never a missing-profile failure.
  const loading = Boolean(userId) && (state.loading || state.loadedForUserId !== userId)

  return { ...state, loading, refresh, applyWalletBalance }
}
