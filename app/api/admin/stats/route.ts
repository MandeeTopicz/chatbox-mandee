import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const ROUTE = '/api/admin/stats'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    logger.warn('auth.unauthorized', { route: ROUTE })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    logger.warn('auth.forbidden', { route: ROUTE, userId: user.id, data: { role: profile?.role } })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = await createServiceClient()

  // Fetch all stats in parallel
  const [schoolsRes, teachersRes, studentsRes, quizzesRes, chessRes, attemptsRes] = await Promise.all([
    service.from('schools').select('id, name', { count: 'exact' }),
    service.from('users').select('id, display_name, email, school_id, created_at', { count: 'exact' }).eq('role', 'teacher'),
    service.from('users').select('id, display_name, email, school_id, created_at', { count: 'exact' }).eq('role', 'student'),
    service.from('quizzes').select('id, teacher_id, school_id, title, created_at', { count: 'exact' }),
    service.from('chess_profiles').select('user_id, wins, losses, draws'),
    service.from('quiz_attempts').select('student_id, quiz_id, score, total, completed_at'),
  ])

  const teachers = teachersRes.data || []
  const students = studentsRes.data || []
  const quizzes = quizzesRes.data || []
  const chessProfiles = chessRes.data || []
  const attempts = attemptsRes.data || []

  // Build teacher details with quiz count
  const teacherDetails = teachers.map((t) => {
    const quizCount = quizzes.filter((q) => q.teacher_id === t.id).length
    return {
      id: t.id,
      display_name: t.display_name,
      email: t.email,
      school_id: t.school_id,
      quiz_count: quizCount,
      created_at: t.created_at,
    }
  })

  // Build student details with chess record and quiz attempts
  const studentDetails = students.map((s) => {
    const chess = chessProfiles.find((cp) => cp.user_id === s.id)
    const studentAttempts = attempts.filter((a) => a.student_id === s.id)
    return {
      id: s.id,
      display_name: s.display_name,
      email: s.email,
      school_id: s.school_id,
      chess_wins: chess?.wins ?? 0,
      chess_losses: chess?.losses ?? 0,
      chess_draws: chess?.draws ?? 0,
      quizzes_taken: studentAttempts.length,
      created_at: s.created_at,
    }
  })

  return NextResponse.json({
    stats: {
      total_schools: schoolsRes.count ?? 0,
      total_teachers: teachersRes.count ?? 0,
      total_students: studentsRes.count ?? 0,
      total_quizzes: quizzesRes.count ?? 0,
    },
    schools: schoolsRes.data || [],
    teachers: teacherDetails,
    students: studentDetails,
  })
}
