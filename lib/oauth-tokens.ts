import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'
import { OAUTH_PROVIDERS, refreshAccessToken } from '@/lib/oauth-providers'

/**
 * Get a valid access token for a user + provider.
 * Refreshes automatically if within 5 minutes of expiry.
 * Returns null if no tokens stored.
 */
export async function getValidToken(userId: string, providerKey: string): Promise<string | null> {
  const provider = OAUTH_PROVIDERS[providerKey]
  if (!provider) return null

  const supabase = await createClient()

  const { data: row } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', providerKey)
    .single()

  if (!row) return null

  const expiresAt = new Date(row.expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

  // Token is still fresh
  if (expiresAt > fiveMinutesFromNow) {
    return decrypt(row.access_token)
  }

  // Token expiring — refresh it
  const refreshToken = decrypt(row.refresh_token)
  if (!refreshToken) return null

  try {
    const data = await refreshAccessToken(provider, refreshToken)
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

    await supabase
      .from('google_tokens')
      .update({
        access_token: encrypt(data.access_token),
        expires_at: newExpiresAt,
      })
      .eq('user_id', userId)
      .eq('provider', providerKey)

    return data.access_token
  } catch {
    return null
  }
}

/**
 * Check if a user has connected a specific OAuth provider.
 */
export async function hasConnection(userId: string, providerKey: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_tokens')
    .select('user_id')
    .eq('user_id', userId)
    .eq('provider', providerKey)
    .single()
  return !!data
}
