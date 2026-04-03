import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — important for Server Components
  // Wrap in try/catch to handle stale/corrupt cookies gracefully
  let user = null
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    user = u
  } catch {
    // Corrupt auth cookie (e.g., from a previous Supabase instance).
    // Clear all sb-* cookies so the user gets a fresh start.
    const cookieNames = request.cookies.getAll().map((c) => c.name)
    for (const name of cookieNames) {
      if (name.startsWith('sb-')) {
        supabaseResponse.cookies.delete(name)
      }
    }
  }

  // Protect all routes except auth pages and API auth callback
  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup')
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  if (!user && !isAuthPage && !isAuthCallback && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Content Security Policy — restrict iframe sources to self (registered plugins
  // are served from the same origin via /plugins/*). Blocks third-party origins
  // from being loaded in iframes to prevent unauthorized content injection.
  const appOrigin = request.nextUrl.origin
  supabaseResponse.headers.set(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://unpkg.com https://accounts.google.com https://accounts.spotify.com`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: https://api.weather.gov https://i.scdn.co`,
      `font-src 'self'`,
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://unpkg.com https://accounts.google.com https://oauth2.googleapis.com https://classroom.googleapis.com https://api.weather.gov https://geocoding-api.open-meteo.com https://api.spotify.com https://accounts.spotify.com`,
      `frame-src 'self' ${appOrigin} ${process.env.NEXT_PUBLIC_APP_URL || ''}`,
      `frame-ancestors 'self'`,
    ].join('; ')
  )

  return supabaseResponse
}
