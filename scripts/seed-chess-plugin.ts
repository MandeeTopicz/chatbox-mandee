/**
 * Seed script: registers the chess plugin in Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-chess-plugin.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function seed() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const plugin = {
    name: 'chess',
    url: `${baseUrl}/plugins/chess/index.html`,
    tool_schemas: [
      {
        name: 'start_chess_game',
        description:
          'Start a new chess game. Renders an interactive chess board in the chat. The student plays as white against the AI tutor. No parameters required.',
        input_schema: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
      {
        name: 'make_move',
        description:
          'Make a move on the chess board. Provide the source and destination squares in algebraic notation (e.g., e2 to e4). Returns the updated board state (FEN), game status, and the last move. Returns an error if the move is illegal.',
        input_schema: {
          type: 'object' as const,
          properties: {
            from: {
              type: 'string',
              description: 'Source square in algebraic notation (e.g., "e2")',
            },
            to: {
              type: 'string',
              description: 'Destination square in algebraic notation (e.g., "e4")',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_board_state',
        description:
          'Get the current board state as a FEN string. Use this when the student asks about the current position, wants advice on what to do next, or when you need to analyze the board.',
        input_schema: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
      {
        name: 'resign_game',
        description:
          'Resign the current chess game. Ends the game immediately with a loss for the player who resigns. Use when the student asks to give up or resign.',
        input_schema: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
    ],
    allowed: true,
  }

  const { data, error } = await supabase
    .from('plugins')
    .upsert(plugin, { onConflict: 'name' })
    .select()
    .single()

  if (error) {
    console.error('Failed to seed chess plugin:', error.message)
    process.exit(1)
  }

  console.log('Chess plugin seeded successfully:')
  console.log(`  ID:      ${data.id}`)
  console.log(`  Name:    ${data.name}`)
  console.log(`  URL:     ${data.url}`)
  console.log(`  Allowed: ${data.allowed}`)
  console.log(`  Tools:   start_chess_game, make_move, get_board_state, resign_game`)
}

seed()
