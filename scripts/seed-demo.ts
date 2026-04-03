/**
 * Seed demo school, accounts, quizzes, chess games, and quiz attempts.
 *
 * Creates:
 * - Gauntlet Academy school
 * - admin@gauntlet.edu   (role: admin,   password: Demo1234!)
 * - teacher@gauntlet.edu (role: teacher, password: Demo1234!)
 * - student@gauntlet.edu (role: student, password: Demo1234!)
 * - 3 quizzes (Civil War, Pythagorean Theorem, Solar System — 5 cards each)
 * - 3 chess games for student (2W 1L)
 * - 2 quiz attempts for student
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts
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

const PASSWORD = 'Demo1234!'

const DEMO_QUIZZES = [
  {
    title: 'Civil War Key Events',
    topic: 'Civil War',
    cards: [
      { question: 'What year did the Civil War begin?', answer: '1861' },
      { question: 'Who was president during the Civil War?', answer: 'Abraham Lincoln' },
      { question: 'What battle is considered the turning point?', answer: 'Battle of Gettysburg' },
      { question: 'What document freed slaves in Confederate states?', answer: 'Emancipation Proclamation' },
      { question: 'What year did the Civil War end?', answer: '1865' },
    ],
  },
  {
    title: 'Pythagorean Theorem',
    topic: 'Pythagorean theorem',
    cards: [
      { question: 'State the Pythagorean theorem formula.', answer: 'a² + b² = c²' },
      { question: 'In a right triangle, what is the longest side called?', answer: 'Hypotenuse' },
      { question: 'If a=3 and b=4, what is c?', answer: '5' },
      { question: 'Who is the theorem named after?', answer: 'Pythagoras' },
      { question: 'Does the theorem work for non-right triangles?', answer: 'No, only right triangles' },
    ],
  },
  {
    title: 'The Solar System',
    topic: 'Solar System',
    cards: [
      { question: 'How many planets are in our solar system?', answer: '8' },
      { question: 'Which planet is closest to the Sun?', answer: 'Mercury' },
      { question: 'Which planet is known as the Red Planet?', answer: 'Mars' },
      { question: 'What is the largest planet?', answer: 'Jupiter' },
      { question: 'What type of star is our Sun?', answer: 'Yellow dwarf (G-type main-sequence)' },
    ],
  },
]

async function createOrGetUser(
  email: string,
  role: string,
  displayName: string,
  schoolId: string
): Promise<string> {
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role, display_name: displayName, school_id: schoolId },
  })

  if (authErr) {
    if (authErr.message.includes('already been registered')) {
      console.log(`  ${email} already exists — looking up ID`)
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (!data) {
        console.error(`  Could not find existing user ${email}`)
        process.exit(1)
      }

      // Update school_id in case it changed
      await supabase
        .from('users')
        .update({ school_id: schoolId, role })
        .eq('id', data.id)

      return data.id
    }
    console.error(`  Failed to create ${email}:`, authErr.message)
    process.exit(1)
  }

  console.log(`  ${email} created (${authData.user.id})`)

  // Update school_id (trigger may not set it if timing is off)
  await supabase
    .from('users')
    .update({ school_id: schoolId })
    .eq('id', authData.user.id)

  return authData.user.id
}

async function seed() {
  console.log('=== ChatBridge Demo Seed ===\n')

  // 1. Create school
  console.log('Creating school...')
  const { data: existingSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('name', 'Gauntlet Academy')
    .single()

  let schoolId: string

  if (existingSchool) {
    schoolId = existingSchool.id
    console.log(`  Gauntlet Academy already exists (${schoolId})`)
  } else {
    const { data: newSchool, error } = await supabase
      .from('schools')
      .insert({ name: 'Gauntlet Academy', district: 'Gauntlet District' })
      .select('id')
      .single()

    if (error || !newSchool) {
      console.error('  Failed to create school:', error?.message)
      process.exit(1)
    }

    schoolId = newSchool.id
    console.log(`  Gauntlet Academy created (${schoolId})`)
  }

  // 2. Create users
  console.log('\nCreating users...')
  const adminId = await createOrGetUser('admin@gauntlet.edu', 'admin', 'Admin User', schoolId)
  const teacherId = await createOrGetUser('teacher@gauntlet.edu', 'teacher', 'Ms. Johnson', schoolId)
  const studentId = await createOrGetUser('student@gauntlet.edu', 'student', 'Alex Rivera', schoolId)

  // 3. Create quizzes
  console.log('\nCreating quizzes...')
  const quizIds: string[] = []

  for (const quiz of DEMO_QUIZZES) {
    // Check if quiz already exists
    const { data: existing } = await supabase
      .from('quizzes')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('title', quiz.title)
      .single()

    if (existing) {
      console.log(`  "${quiz.title}" already exists (${existing.id})`)
      quizIds.push(existing.id)
      continue
    }

    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        teacher_id: teacherId,
        school_id: schoolId,
        ...quiz,
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error(`  FAILED: ${quiz.title} — ${error?.message}`)
      continue
    }

    quizIds.push(data.id)
    console.log(`  "${quiz.title}" — ${quiz.cards.length} cards (${data.id})`)
  }

  // 4. Create chess profile for student (2W 1L)
  console.log('\nCreating chess profile...')
  const { error: chessErr } = await supabase
    .from('chess_profiles')
    .upsert({
      user_id: studentId,
      wins: 2,
      losses: 1,
      draws: 0,
      streak: 1,
      rating: 1250,
    })

  if (chessErr) {
    console.error('  Failed to create chess profile:', chessErr.message)
  } else {
    console.log('  Chess profile: 2W 1L 0D, rating 1250')
  }

  // 5. Create quiz attempts for student
  console.log('\nCreating quiz attempts...')
  if (quizIds.length >= 2) {
    // Clear existing attempts for this student to avoid duplicates
    await supabase
      .from('quiz_attempts')
      .delete()
      .eq('student_id', studentId)

    const attempts = [
      { student_id: studentId, quiz_id: quizIds[0], score: 4, total: 5 },
      { student_id: studentId, quiz_id: quizIds[1], score: 3, total: 5 },
    ]

    const { error: attemptErr } = await supabase
      .from('quiz_attempts')
      .insert(attempts)

    if (attemptErr) {
      console.error('  Failed to create attempts:', attemptErr.message)
    } else {
      console.log('  2 quiz attempts logged')
    }
  }

  console.log('\n=== Done! ===')
  console.log('\nDemo accounts (password for all: Demo1234!):')
  console.log(`  Admin:   admin@gauntlet.edu   → /admin`)
  console.log(`  Teacher: teacher@gauntlet.edu → /teacher`)
  console.log(`  Student: student@gauntlet.edu → /chat`)
}

seed()
