import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchTracks } from '@/lib/spotify'
import { logger } from '@/lib/logger'

const ROUTE = '/api/spotify/search'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 })
  }

  try {
    const tracks = await searchTracks(user.id, query)
    return NextResponse.json(tracks)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed'
    if (message.includes('No valid Spotify access token')) {
      return NextResponse.json({ error: 'Spotify not connected', needsAuth: true }, { status: 401 })
    }
    logger.error('spotify.search_error', { route: ROUTE, userId: user.id, data: { error: message } })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
