/**
 * Register the Google Classroom plugin.
 *
 * Usage:
 *   npx tsx scripts/seed-classroom-plugin.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PLUGIN = {
  name: 'google-classroom',
  // This plugin has no iframe — it's a server-side-only tool
  url: 'about:blank',
  allowed: true,
  tool_schemas: [
    {
      name: 'post_to_classroom',
      description:
        'Post a quiz to a Google Classroom course as an assignment. Only available to teachers who have connected their Google account. Use when a teacher asks to share a quiz with their class.',
      input_schema: {
        type: 'object',
        properties: {
          quizId: {
            type: 'string',
            description: 'The ID of the quiz to post',
          },
          courseId: {
            type: 'string',
            description: 'The Google Classroom course ID to post to',
          },
          courseName: {
            type: 'string',
            description: 'The name of the course (for confirmation message)',
          },
        },
        required: ['quizId', 'courseId', 'courseName'],
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
    console.error('Failed to seed google-classroom plugin:', error.message)
    process.exit(1)
  }

  console.log(`  google-classroom (${data.id})`)
  console.log('    Tools: post_to_classroom')
  console.log('\nDone.')
}

seed()
