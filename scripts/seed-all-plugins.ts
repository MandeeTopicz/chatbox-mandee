/**
 * Seed all ChatBridge plugins into Supabase.
 * Pass NEXT_PUBLIC_APP_URL to set plugin URLs for production.
 *
 * Usage:
 *   npx tsx scripts/seed-all-plugins.ts                         # localhost
 *   NEXT_PUBLIC_APP_URL=https://chatbridge.vercel.app npx tsx scripts/seed-all-plugins.ts  # production
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
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const plugins = [
  {
    name: 'chess',
    url: `${baseUrl}/plugins/chess/index.html`,
    tool_schemas: [
      {
        name: 'start_chess_game',
        description: 'Start a new chess game. Renders an interactive chess board in the chat. The student plays as white against the AI tutor. No parameters required.',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'make_move',
        description: 'Make a move on the chess board. Provide the source and destination squares in algebraic notation (e.g., e2 to e4). Returns the updated board state (FEN), game status, and the last move. Returns an error if the move is illegal.',
        input_schema: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Source square in algebraic notation (e.g., "e2")' },
            to: { type: 'string', description: 'Destination square in algebraic notation (e.g., "e4")' },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_board_state',
        description: 'Get the current board state as a FEN string. Use this when the student asks about the current position, wants advice on what to do next, or when you need to analyze the board.',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'resign_game',
        description: 'Resign the current chess game. Ends the game immediately with a loss for the player who resigns.',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
    ],
    allowed: true,
  },
  {
    name: 'graphing-calculator',
    url: `${baseUrl}/plugins/graphing-calculator/index.html`,
    tool_schemas: [
      {
        name: 'render_graph',
        description: 'Render an interactive graph of a mathematical equation. The graph appears inline in the chat. Use this when a student asks to graph, plot, or visualize a function or equation.',
        input_schema: {
          type: 'object',
          properties: {
            equation: { type: 'string', description: 'The equation to graph in standard math notation. Use x as the variable. Examples: "x^2 - 4", "sin(x)"' },
            xMin: { type: 'number', description: 'Minimum x-axis value (default: -10)' },
            xMax: { type: 'number', description: 'Maximum x-axis value (default: 10)' },
            yMin: { type: 'number', description: 'Minimum y-axis value (default: -10)' },
            yMax: { type: 'number', description: 'Maximum y-axis value (default: 10)' },
          },
          required: ['equation'],
        },
      },
    ],
    allowed: true,
  },
  {
    name: 'flashcard-quiz',
    url: `${baseUrl}/plugins/flashcard-quiz/index.html`,
    tool_schemas: [
      {
        name: 'start_quiz',
        description: "Start a flashcard quiz for the student. Fetches quiz cards by topic or quiz ID and presents them one at a time. Use this when a student asks to study, practice, review, or take a quiz on a topic.",
        input_schema: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'The topic to quiz on (e.g., "Civil War", "fractions")' },
            quizId: { type: 'string', description: 'Optional specific quiz ID' },
          },
          required: ['topic'],
        },
      },
      {
        name: 'submit_answer',
        description: "Submit the student's answer for the current flashcard.",
        input_schema: {
          type: 'object',
          properties: {
            cardIndex: { type: 'number', description: 'The index of the card being answered (0-based)' },
            answer: { type: 'string', description: "The student's answer text" },
          },
          required: ['cardIndex', 'answer'],
        },
      },
    ],
    allowed: true,
  },
  {
    name: 'weather',
    url: `${baseUrl}/plugins/weather/index.html`,
    tool_schemas: [
      {
        name: 'get_weather',
        description: 'Get current weather conditions for a city. Returns temperature, humidity, wind speed, and description. Use when the student asks about weather in a specific location.',
        input_schema: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: 'City name (e.g., "New York", "London", "Tokyo")',
            },
          },
          required: ['city'],
        },
      },
    ],
    allowed: true,
  },
]

async function seed() {
  console.log(`Seeding plugins for: ${baseUrl}\n`)

  for (const plugin of plugins) {
    const { data, error } = await supabase
      .from('plugins')
      .upsert(plugin, { onConflict: 'name' })
      .select('id, name, url, allowed')
      .single()

    if (error) {
      console.error(`  FAILED: ${plugin.name} — ${error.message}`)
    } else {
      const toolNames = plugin.tool_schemas.map((t) => t.name).join(', ')
      console.log(`  ${data.name} (${data.id})`)
      console.log(`    URL: ${data.url}`)
      console.log(`    Tools: ${toolNames}\n`)
    }
  }

  console.log('Done.')
}

seed()
