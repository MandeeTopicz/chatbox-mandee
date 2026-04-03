/**
 * Register the Spotify plugin.
 * Usage: npx tsx scripts/seed-spotify-plugin.ts
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const PLUGIN = {
  name: 'spotify',
  url: `${baseUrl}/plugins/spotify/index.html`,
  allowed: true,
  tool_schemas: [
    {
      name: 'search_tracks',
      description: 'Search Spotify for tracks related to a topic or query. Returns track names, artists, and album art. Requires the user to have connected their Spotify account.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g., "classical music for studying", "songs about space")' },
        },
        required: ['query'],
      },
    },
    {
      name: 'create_playlist',
      description: 'Create a Spotify playlist with tracks matching a query. Good for study playlists or topic-related music. Requires the user to have connected their Spotify account.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Playlist name' },
          description: { type: 'string', description: 'Playlist description' },
          query: { type: 'string', description: 'Search query to find tracks for the playlist' },
        },
        required: ['name', 'query'],
      },
    },
  ],
}

async function seed() {
  const { data, error } = await supabase
    .from('plugins')
    .upsert(PLUGIN, { onConflict: 'name' })
    .select('id, name')
    .single()

  if (error) {
    console.error('Failed:', error.message)
    process.exit(1)
  }

  console.log(`  spotify (${data.id})`)
  console.log(`    URL: ${PLUGIN.url}`)
  console.log('    Tools: search_tracks, create_playlist')
  console.log('\nDone.')
}

seed()
