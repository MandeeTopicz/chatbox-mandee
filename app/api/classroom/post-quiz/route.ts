import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classroomPost } from '@/lib/google-classroom'
import { logger } from '@/lib/logger'

const ROUTE = '/api/classroom/post-quiz'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    logger.warn('auth.unauthorized', { route: ROUTE })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') {
    logger.warn('auth.forbidden', { route: ROUTE, userId: user.id })
    return NextResponse.json({ error: 'Forbidden: teachers only' }, { status: 403 })
  }

  const body = await request.json()
  const { quizId, courseId } = body

  if (!quizId || !courseId) {
    return NextResponse.json({ error: 'quizId and courseId are required' }, { status: 400 })
  }

  // Fetch quiz details
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('title, topic, cards')
    .eq('id', quizId)
    .single()

  if (quizError || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  }

  const cardCount = Array.isArray(quiz.cards) ? quiz.cards.length : 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Create a Google Classroom assignment (coursework)
  const coursework = {
    title: `Quiz: ${quiz.title}`,
    description: `${quiz.topic} — ${cardCount} flashcards. Open ChatBridge and ask the AI tutor to quiz you on "${quiz.topic}".`,
    workType: 'ASSIGNMENT',
    state: 'PUBLISHED',
    materials: [
      {
        link: {
          url: `${appUrl}/chat`,
          title: 'Open ChatBridge',
        },
      },
    ],
  }

  try {
    const res = await classroomPost(user.id, `courses/${courseId}/courseWork`, coursework)

    if (!res.ok) {
      const errText = await res.text()
      logger.error('classroom.post_quiz_failed', { route: ROUTE, userId: user.id, data: { status: res.status, courseId } })
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: res.status })
    }

    const data = await res.json()
    logger.info('classroom.quiz_posted', { route: ROUTE, userId: user.id, data: { quizId, courseId, assignmentId: data.id } })

    return NextResponse.json({
      success: true,
      assignmentId: data.id,
      title: quiz.title,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('No valid Google access token')) {
      return NextResponse.json({ error: 'Google not connected', needsAuth: true }, { status: 401 })
    }
    logger.error('classroom.post_quiz_error', { route: ROUTE, userId: user.id, data: { error: message } })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
