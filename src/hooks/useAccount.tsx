import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Db1Profile, Db1Wallet } from '../lib/db1'
import { useAuthSession } from './useAuthSession'
import { useDb1Account } from './useDb1Account'

type AccountValue = {
  user: User | null
  authLoading: boolean
  isAuthenticated: boolean
  profile: Db1Profile | null
  wallet: Db1Wallet | null
  /** Vrai tant que le profil ET le portefeuille ne sont pas revenus. */
  loading: boolean
  profileError: boolean
  walletError: boolean
  refresh: () => Promise<void>
  /** Met à jour l'affichage depuis une réponse DB1/DB3A, sans écriture frontend. */
  applyWalletBalance: (balance: number) => void
  /** Nom saisi à l'inscription, conservé dans les métadonnées Supabase Auth. */
  authFullName: string | null
}

const AccountContext = createContext<AccountValue | null>(null)

/**
 * Source unique du compte pour tout l'espace applicatif : session Auth, profil
 * et portefeuille DB1. Le bandeau et la page qu'il coiffe lisent la même donnée,
 * donc Supabase n'est interrogé qu'une fois par navigation.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isAuthenticated } = useAuthSession()
  const account = useDb1Account(user?.id)

  const metadataName = user?.user_metadata.full_name
  const authFullName = typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null

  const value = useMemo<AccountValue>(
    () => ({
      user,
      authLoading,
      isAuthenticated,
      profile: account.profile,
      wallet: account.wallet,
      loading: account.loading,
      profileError: account.profileError,
      walletError: account.walletError,
      refresh: account.refresh,
      applyWalletBalance: account.applyWalletBalance,
      authFullName,
    }),
    [
      account.loading,
      account.profile,
      account.profileError,
      account.applyWalletBalance,
      account.refresh,
      account.wallet,
      account.walletError,
      authFullName,
      authLoading,
      isAuthenticated,
      user,
    ],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountValue {
  const value = useContext(AccountContext)
  if (!value) throw new Error('useAccount must be used inside <AccountProvider>')
  return value
}
