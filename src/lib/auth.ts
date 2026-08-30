import { supabase } from './supabaseClient'
import type { Locale } from '../i18n'

export async function signUpWithEmail(params: { fullName: string; email: string; password: string }) {
  const { fullName, email, password } = params

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })
}

export async function signInWithEmail(params: { email: string; password: string }) {
  const { email, password } = params

  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

/**
 * Sends a recovery link without exposing Auth errors to the UI. Supabase's
 * hosted mail template is global, so the locale travels only to the localized
 * reset page after the recipient opens the link.
 */
export async function requestPasswordReset(email: string, locale: Locale = 'fr') {
  const redirect = new URL('/auth', window.location.origin)
  redirect.searchParams.set('mode', 'reset')
  redirect.searchParams.set('lang', locale)

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirect.toString(),
  })
}

/** Updates the authenticated user's password. Used by the password change panel. */
export async function updateUserPassword(password: string) {
  return supabase.auth.updateUser({ password })
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  return error ? null : data.user
}

/**
 * Temporary profile completion uses the authenticated user's metadata only.
 * A dedicated `profiles` table will replace this once it is designed with RLS.
 */
export async function updateProfileMetadata(params: { fullName: string; fullNameAr: string; phone: string }) {
  const { fullName, fullNameAr, phone } = params

  return supabase.auth.updateUser({
    data: {
      full_name: fullName,
      full_name_ar: fullNameAr,
      phone,
    },
  })
}
