/**
 * Seed script: registers the flashcard quiz plugin in Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-quiz-plugin.ts
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
    name: 'flashcard-quiz',
    url: `${baseUrl}/plugins/flashcard-quiz/index.html`,
    tool_schemas: [
      {
        name: 'start_quiz',
        description:
          'Start a flashcard quiz for the student. Fetches quiz cards by topic or quiz ID and presents them one at a time. Use this when a student asks to study, practice, review, or take a quiz on a topic.',
        input_schema: {
          type: 'object' as const,
          properties: {
            topic: {
              type: 'string',
              description: 'The topic to quiz on (e.g., "Civil War", "fractions"). Searches for matching quizzes.',
            },
            quizId: {
              type: 'string',
              description: 'Optional specific quiz ID. If provided, loads that exact quiz.',
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'submit_answer',
        description:
          'Submit the student\'s answer for the current flashcard. The quiz plugin will check it and advance to the next card. Only use this if the student types their answer in the chat instead of using the quiz UI directly.',
        input_schema: {
          type: 'object' as const,
          properties: {
            cardIndex: {
              type: 'number',
              description: 'The index of the card being answered (0-based).',
            },
            answer: {
              type: 'string',
              description: 'The student\'s answer text.',
            },
          },
          required: ['cardIndex', 'answer'],
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
    console.error('Failed to seed quiz plugin:', error.message)
    process.exit(1)
  }

  console.log('Flashcard quiz plugin seeded successfully:')
  console.log(`  ID:      ${data.id}`)
  console.log(`  Name:    ${data.name}`)
  console.log(`  URL:     ${data.url}`)
  console.log(`  Allowed: ${data.allowed}`)
  console.log(`  Tools:   start_quiz, submit_answer`)
}

seed()
