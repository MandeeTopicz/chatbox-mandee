import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OAUTH_PROVIDERS, buildAuthUrl } from '@/lib/oauth-providers'
import { logger } from '@/lib/logger'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerKey } = await params
  const provider = OAUTH_PROVIDERS[providerKey]

  if (!provider) {
    return NextResponse.json({ error: `Unknown OAuth provider: ${providerKey}` }, { status: 404 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  try {
    // State encodes: userId|providerKey for verification on callback
    const state = `${user.id}|${providerKey}`
    const authUrl = buildAuthUrl(provider, state)

    logger.info('oauth.redirect', { route: `/api/auth/oauth/${providerKey}`, userId: user.id })
    return NextResponse.redirect(authUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth config error'
    logger.error('oauth.config_error', { route: `/api/auth/oauth/${providerKey}`, userId: user.id, data: { error: message } })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
