import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/quizzes — list all quizzes (any authenticated user)
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic')

  let query = supabase
    .from('quizzes')
    .select('id, title, topic, created_at')
    .order('created_at', { ascending: false })

  if (topic) {
    query = query.ilike('topic', `%${topic}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/quizzes — create a new quiz (teacher only)
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check teacher role server-side
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Forbidden: only teachers can create quizzes' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { title, topic, cards } = body

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!topic || typeof topic !== 'string') {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  }
  if (!Array.isArray(cards) || cards.length === 0) {
    return NextResponse.json({ error: 'cards must be a non-empty array' }, { status: 400 })
  }

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    if (!card.question || typeof card.question !== 'string') {
      return NextResponse.json({ error: `Card ${i + 1}: question is required` }, { status: 400 })
    }
    if (!card.answer || typeof card.answer !== 'string') {
      return NextResponse.json({ error: `Card ${i + 1}: answer is required` }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      teacher_id: user.id,
      title,
      topic,
      cards,
    })
    .select('id, title, topic, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
