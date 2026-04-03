import { getValidToken } from '@/lib/oauth-tokens'

const API_BASE = 'https://api.spotify.com/v1'

/**
 * Make an authenticated GET request to the Spotify API.
 */
export async function spotifyGet(userId: string, path: string): Promise<Response> {
  const token = await getValidToken(userId, 'spotify')
  if (!token) throw new Error('No valid Spotify access token')

  return fetch(`${API_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

/**
 * Make an authenticated POST request to the Spotify API.
 */
export async function spotifyPost(userId: string, path: string, body: unknown): Promise<Response> {
  const token = await getValidToken(userId, 'spotify')
  if (!token) throw new Error('No valid Spotify access token')

  return fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

/**
 * Search Spotify for tracks.
 */
export async function searchTracks(userId: string, query: string, limit = 5) {
  const res = await spotifyGet(userId, `search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`)
  if (!res.ok) throw new Error(`Spotify search failed (${res.status})`)
  const data = await res.json()
  return (data.tracks?.items || []).map((t: { id: string; name: string; artists: { name: string }[]; album: { name: string; images: { url: string }[] }; external_urls: { spotify: string }; duration_ms: number }) => ({
    id: t.id,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    albumArt: t.album.images?.[0]?.url || null,
    url: t.external_urls.spotify,
    durationMs: t.duration_ms,
  }))
}

/**
 * Create a playlist and add tracks.
 */
export async function createPlaylist(
  userId: string,
  name: string,
  description: string,
  trackIds: string[]
) {
  // Get Spotify user ID
  const meRes = await spotifyGet(userId, 'me')
  if (!meRes.ok) throw new Error('Failed to get Spotify profile')
  const me = await meRes.json()

  // Create playlist
  const playlistRes = await spotifyPost(userId, `users/${me.id}/playlists`, {
    name,
    description,
    public: false,
  })
  if (!playlistRes.ok) throw new Error('Failed to create playlist')
  const playlist = await playlistRes.json()

  // Add tracks
  if (trackIds.length > 0) {
    const uris = trackIds.map((id) => `spotify:track:${id}`)
    await spotifyPost(userId, `playlists/${playlist.id}/tracks`, { uris })
  }

  return {
    id: playlist.id,
    name: playlist.name,
    url: playlist.external_urls.spotify,
    trackCount: trackIds.length,
  }
}
