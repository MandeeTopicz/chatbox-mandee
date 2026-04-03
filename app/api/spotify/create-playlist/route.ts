import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchTracks, createPlaylist } from '@/lib/spotify'
import { logger } from '@/lib/logger'

const ROUTE = '/api/spotify/create-playlist'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, query, trackIds } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  try {
    let ids = trackIds as string[] | undefined

    // If no track IDs provided but a search query is, search and use those
    if ((!ids || ids.length === 0) && query) {
      const tracks = await searchTracks(user.id, query, 10)
      ids = tracks.map((t: { id: string }) => t.id)
    }

    const playlist = await createPlaylist(
      user.id,
      name,
      description || `Created by ChatBridge`,
      ids || []
    )

    logger.info('spotify.playlist_created', { route: ROUTE, userId: user.id, data: { playlistId: playlist.id, tracks: playlist.trackCount } })
    return NextResponse.json(playlist, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create playlist'
    if (message.includes('No valid Spotify access token')) {
      return NextResponse.json({ error: 'Spotify not connected', needsAuth: true }, { status: 401 })
    }
    logger.error('spotify.create_error', { route: ROUTE, userId: user.id, data: { error: message } })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
