import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'
import { logger } from '@/lib/logger'

const ROUTE = '/api/auth/google/callback'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    logger.warn('google_oauth.denied', { route: ROUTE, data: { error } })
    return NextResponse.redirect(new URL('/teacher?google_error=denied', baseUrl))
  }

  if (!code || !state) {
    logger.warn('google_oauth.missing_params', { route: ROUTE })
    return NextResponse.redirect(new URL('/teacher?google_error=missing_params', baseUrl))
  }

  // Verify the state matches the authenticated user
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    logger.warn('auth.unauthorized', { route: ROUTE })
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  if (state !== user.id) {
    logger.warn('google_oauth.state_mismatch', { route: ROUTE, userId: user.id })
    return NextResponse.redirect(new URL('/teacher?google_error=state_mismatch', baseUrl))
  }

  // Exchange code for tokens
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text()
    logger.error('google_oauth.token_exchange_failed', { route: ROUTE, userId: user.id, data: { status: tokenRes.status } })
    return NextResponse.redirect(new URL('/teacher?google_error=token_exchange', baseUrl))
  }

  const tokens = await tokenRes.json()
  const accessToken = tokens.access_token as string
  const refreshToken = tokens.refresh_token as string
  const expiresIn = tokens.expires_in as number // seconds

  if (!accessToken || !refreshToken) {
    logger.error('google_oauth.missing_tokens', { route: ROUTE, userId: user.id })
    return NextResponse.redirect(new URL('/teacher?google_error=missing_tokens', baseUrl))
  }

  // Encrypt and store tokens
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const { error: upsertError } = await supabase
    .from('google_tokens')
    .upsert({
      user_id: user.id,
      access_token: encrypt(accessToken),
      refresh_token: encrypt(refreshToken),
      expires_at: expiresAt,
    })

  if (upsertError) {
    logger.error('google_oauth.store_failed', { route: ROUTE, userId: user.id, data: { error: upsertError.message } })
    return NextResponse.redirect(new URL('/teacher?google_error=store_failed', baseUrl))
  }

  logger.info('google_oauth.connected', { route: ROUTE, userId: user.id })
  return NextResponse.redirect(new URL('/teacher?google_connected=true', baseUrl))
}
