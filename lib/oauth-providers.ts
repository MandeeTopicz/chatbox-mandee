/**
 * Unified OAuth provider configuration.
 * Add new providers here — the routes and token management are generic.
 */

export interface OAuthProvider {
  name: string
  clientIdEnv: string
  clientSecretEnv: string
  redirectUriEnv: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
  /** Extra params to include in the auth URL (e.g., access_type=offline) */
  extraAuthParams?: Record<string, string>
  /** Where to redirect after successful connection */
  successRedirect: string
}

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  google: {
    name: 'Google Classroom',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    redirectUriEnv: 'GOOGLE_REDIRECT_URI',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.students',
    ],
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    successRedirect: '/teacher',
  },
  'google-calendar': {
    name: 'Google Calendar',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    redirectUriEnv: 'GOOGLE_CALENDAR_REDIRECT_URI',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    successRedirect: '/chat',
  },
}

/**
 * Build the OAuth authorization URL for a provider.
 */
export function buildAuthUrl(provider: OAuthProvider, state: string): string {
  const clientId = process.env[provider.clientIdEnv]
  const redirectUri = process.env[provider.redirectUriEnv]

  if (!clientId || !redirectUri) {
    throw new Error(`${provider.name} OAuth not configured: missing ${provider.clientIdEnv} or ${provider.redirectUriEnv}`)
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state,
    ...provider.extraAuthParams,
  })

  return `${provider.authUrl}?${params.toString()}`
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCode(
  provider: OAuthProvider,
  code: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const clientId = process.env[provider.clientIdEnv]!
  const clientSecret = process.env[provider.clientSecretEnv]!
  const redirectUri = process.env[provider.redirectUriEnv]!

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers,
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed (${res.status}): ${err}`)
  }

  return res.json()
}

/**
 * Refresh an access token.
 */
export async function refreshAccessToken(
  provider: OAuthProvider,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env[provider.clientIdEnv]!
  const clientSecret = process.env[provider.clientSecretEnv]!

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  })

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status})`)
  }

  return res.json()
}
