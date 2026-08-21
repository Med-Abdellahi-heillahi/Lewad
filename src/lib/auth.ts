import { supabase } from './supabaseClient'

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

/** Sends the signed-in member a recovery link without exposing Auth errors to the UI. */
export async function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth`,
  })
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
