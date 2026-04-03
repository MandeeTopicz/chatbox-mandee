import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') {
    logger.warn('auth.forbidden', { route: '/api/teacher/dashboard', userId: user.id, data: { role: profile?.role } })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = profile.school_id
  const service = await createServiceClient()

  // Fetch teacher's quizzes
  let quizzesQuery = service
    .from('quizzes')
    .select('id, title, topic, cards, created_at')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  const { data: quizzes } = await quizzesQuery

  // Fetch students at the same school
  let studentsData: Array<{
    id: string
    display_name: string | null
    email: string
  }> = []

  if (schoolId) {
    const { data } = await service
      .from('users')
      .select('id, display_name, email')
      .eq('role', 'student')
      .eq('school_id', schoolId)

    studentsData = data || []
  }

  // Fetch quiz attempts from students at this school
  const studentIds = studentsData.map((s) => s.id)
  let recentAttempts: Array<{
    id: string
    student_id: string
    quiz_id: string
    score: number
    total: number
    completed_at: string
  }> = []

  if (studentIds.length > 0) {
    const { data } = await service
      .from('quiz_attempts')
      .select('id, student_id, quiz_id, score, total, completed_at')
      .in('student_id', studentIds)
      .order('completed_at', { ascending: false })
      .limit(20)

    recentAttempts = data || []
  }

  // Get school name
  let schoolName: string | null = null
  if (schoolId) {
    const { data } = await service
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .single()
    schoolName = data?.name ?? null
  }

  return NextResponse.json({
    school_name: schoolName,
    quizzes: quizzes || [],
    students: studentsData,
    recent_attempts: recentAttempts,
  })
}
