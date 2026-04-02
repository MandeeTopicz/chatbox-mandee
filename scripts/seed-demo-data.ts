/**
 * Seed demo accounts and quiz data.
 *
 * Creates:
 * - student@demo.com (role: student, password: demo123456)
 * - teacher@demo.com (role: teacher, password: demo123456)
 * - 3 demo quizzes created by the teacher account
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts
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

const DEMO_QUIZZES = [
  {
    title: 'Civil War Key Events',
    topic: 'Civil War',
    cards: [
      { question: 'What year did the Civil War begin?', answer: '1861' },
      { question: 'Who was president during the Civil War?', answer: 'Abraham Lincoln' },
      { question: 'What battle is considered the turning point of the Civil War?', answer: 'Gettysburg' },
      { question: 'What document freed slaves in Confederate states?', answer: 'Emancipation Proclamation' },
      { question: 'What year did the Civil War end?', answer: '1865' },
    ],
  },
  {
    title: 'Basic Science',
    topic: 'science',
    cards: [
      { question: 'What is the chemical symbol for water?', answer: 'H2O' },
      { question: 'What planet is closest to the Sun?', answer: 'Mercury' },
      { question: 'What force keeps us on the ground?', answer: 'Gravity' },
      { question: 'What is the powerhouse of the cell?', answer: 'Mitochondria' },
      { question: 'What gas do plants absorb from the atmosphere?', answer: 'Carbon dioxide' },
    ],
  },
  {
    title: 'Math Fundamentals',
    topic: 'math',
    cards: [
      { question: 'What is 7 x 8?', answer: '56' },
      { question: 'What is the square root of 144?', answer: '12' },
      { question: 'What is the value of pi to two decimal places?', answer: '3.14' },
      { question: 'How many sides does a hexagon have?', answer: '6' },
      { question: 'What is 15% of 200?', answer: '30' },
    ],
  },
]

async function seed() {
  console.log('Creating demo accounts...\n')

  // Create student demo account
  const { data: studentAuth, error: studentErr } = await supabase.auth.admin.createUser({
    email: 'student@demo.com',
    password: 'demo123456',
    email_confirm: true,
    user_metadata: { role: 'student', display_name: 'Student Demo' },
  })

  if (studentErr) {
    if (studentErr.message.includes('already been registered')) {
      console.log('  student@demo.com already exists — skipping')
    } else {
      console.error('  Failed to create student:', studentErr.message)
    }
  } else {
    console.log(`  student@demo.com created (${studentAuth.user.id})`)
  }

  // Create teacher demo account
  const { data: teacherAuth, error: teacherErr } = await supabase.auth.admin.createUser({
    email: 'teacher@demo.com',
    password: 'demo123456',
    email_confirm: true,
    user_metadata: { role: 'teacher', display_name: 'Teacher Demo' },
  })

  let teacherId: string | null = null

  if (teacherErr) {
    if (teacherErr.message.includes('already been registered')) {
      console.log('  teacher@demo.com already exists — looking up ID')
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'teacher@demo.com')
        .single()
      teacherId = data?.id || null
    } else {
      console.error('  Failed to create teacher:', teacherErr.message)
    }
  } else {
    teacherId = teacherAuth.user.id
    console.log(`  teacher@demo.com created (${teacherId})`)
  }

  if (!teacherId) {
    console.error('\nCannot create quizzes without teacher ID.')
    process.exit(1)
  }

  console.log('\nCreating demo quizzes...\n')

  for (const quiz of DEMO_QUIZZES) {
    const { data, error } = await supabase
      .from('quizzes')
      .upsert(
        { teacher_id: teacherId, ...quiz },
        { onConflict: 'id' }
      )
      .select('id, title, topic')
      .single()

    if (error) {
      console.error(`  FAILED: ${quiz.title} — ${error.message}`)
    } else {
      console.log(`  "${data.title}" (${data.topic}) — ${quiz.cards.length} cards — ID: ${data.id}`)
    }
  }

  console.log('\nDone! Demo accounts:')
  console.log('  Student: student@demo.com / demo123456')
  console.log('  Teacher: teacher@demo.com / demo123456')
}

seed()
