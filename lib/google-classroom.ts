import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'

/**
 * Load and return a valid Google access token for the given user.
 * Refreshes the token if it expires within 5 minutes.
 * Returns null if the user has no stored tokens.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: tokenRow } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!tokenRow) return null

  const expiresAt = new Date(tokenRow.expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

  // Token is still fresh
  if (expiresAt > fiveMinutesFromNow) {
    return decrypt(tokenRow.access_token)
  }

  // Token is expiring or expired — refresh it
  const refreshToken = decrypt(tokenRow.refresh_token)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    // Refresh failed — token may have been revoked
    return null
  }

  const data = await res.json()
  const newAccessToken = data.access_token as string
  const newExpiresIn = data.expires_in as number
  const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString()

  // Update stored token
  await supabase
    .from('google_tokens')
    .update({
      access_token: encrypt(newAccessToken),
      expires_at: newExpiresAt,
    })
    .eq('user_id', userId)

  return newAccessToken
}

/**
 * Check if a user has connected Google Classroom.
 */
export async function hasGoogleConnection(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_tokens')
    .select('user_id')
    .eq('user_id', userId)
    .single()
  return !!data
}

/**
 * Make an authenticated GET request to the Google Classroom API.
 */
export async function classroomGet(userId: string, path: string): Promise<Response> {
  const token = await getValidAccessToken(userId)
  if (!token) {
    throw new Error('No valid Google access token')
  }

  return fetch(`https://classroom.googleapis.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

/**
 * Make an authenticated POST request to the Google Classroom API.
 */
export async function classroomPost(userId: string, path: string, body: unknown): Promise<Response> {
  const token = await getValidAccessToken(userId)
  if (!token) {
    throw new Error('No valid Google access token')
  }

  return fetch(`https://classroom.googleapis.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}
