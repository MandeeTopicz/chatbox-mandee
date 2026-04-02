/**
 * Seed script: registers the graphing calculator plugin in Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-graphing-plugin.ts
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
    name: 'graphing-calculator',
    url: `${baseUrl}/plugins/graphing-calculator/index.html`,
    tool_schemas: [
      {
        name: 'render_graph',
        description:
          'Render an interactive graph of a mathematical equation. The graph appears inline in the chat. Use this when a student asks to graph, plot, or visualize a function or equation. The equation should be in standard math notation (e.g., "x^2 - 4", "sin(x)", "2*x + 3"). Returns structured data about the function including roots, y-intercept, and graph type.',
        input_schema: {
          type: 'object' as const,
          properties: {
            equation: {
              type: 'string',
              description:
                'The equation to graph in standard math notation. Use x as the variable. Examples: "x^2 - 4", "sin(x)", "log(x)", "abs(x)", "2*x + 3"',
            },
            xMin: {
              type: 'number',
              description: 'Minimum x-axis value (default: -10)',
            },
            xMax: {
              type: 'number',
              description: 'Maximum x-axis value (default: 10)',
            },
            yMin: {
              type: 'number',
              description: 'Minimum y-axis value (default: -10)',
            },
            yMax: {
              type: 'number',
              description: 'Maximum y-axis value (default: 10)',
            },
          },
          required: ['equation'],
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
    console.error('Failed to seed graphing plugin:', error.message)
    process.exit(1)
  }

  console.log('Graphing calculator plugin seeded successfully:')
  console.log(`  ID:      ${data.id}`)
  console.log(`  Name:    ${data.name}`)
  console.log(`  URL:     ${data.url}`)
  console.log(`  Allowed: ${data.allowed}`)
  console.log(`  Tools:   render_graph`)
}

seed()
