import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OAUTH_PROVIDERS, exchangeCode } from '@/lib/oauth-providers'
import { encrypt } from '@/lib/crypto'
import { logger } from '@/lib/logger'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerKey } = await params
  const provider = OAUTH_PROVIDERS[providerKey]
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!provider) {
    return NextResponse.redirect(new URL('/login?error=unknown_provider', baseUrl))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    logger.warn('oauth.denied', { route: `/api/auth/oauth/${providerKey}/callback`, data: { error } })
    return NextResponse.redirect(new URL(`${provider.successRedirect}?oauth_error=denied`, baseUrl))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL(`${provider.successRedirect}?oauth_error=missing_params`, baseUrl))
  }

  // Verify state: userId|providerKey
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  const expectedState = `${user.id}|${providerKey}`
  if (state !== expectedState) {
    logger.warn('oauth.state_mismatch', { route: `/api/auth/oauth/${providerKey}/callback`, userId: user.id })
    return NextResponse.redirect(new URL(`${provider.successRedirect}?oauth_error=state_mismatch`, baseUrl))
  }

  // Exchange code for tokens
  try {
    const tokens = await exchangeCode(provider, code)

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Upsert into google_tokens (now with provider column)
    const { error: upsertError } = await supabase
      .from('google_tokens')
      .upsert({
        user_id: user.id,
        provider: providerKey,
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token || ''),
        expires_at: expiresAt,
      }, { onConflict: 'user_id,provider' })

    if (upsertError) {
      logger.error('oauth.store_failed', { route: `/api/auth/oauth/${providerKey}/callback`, userId: user.id, data: { error: upsertError.message } })
      return NextResponse.redirect(new URL(`${provider.successRedirect}?oauth_error=store_failed`, baseUrl))
    }

    logger.info('oauth.connected', { route: `/api/auth/oauth/${providerKey}/callback`, userId: user.id, data: { provider: providerKey } })
    return NextResponse.redirect(new URL(`${provider.successRedirect}?oauth_connected=${providerKey}`, baseUrl))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed'
    logger.error('oauth.token_exchange_failed', { route: `/api/auth/oauth/${providerKey}/callback`, userId: user.id, data: { error: message } })
    return NextResponse.redirect(new URL(`${provider.successRedirect}?oauth_error=token_exchange`, baseUrl))
  }
}
