import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classroomGet } from '@/lib/google-classroom'
import { logger } from '@/lib/logger'

const ROUTE = '/api/classroom/courses'

export async function GET() {
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
    logger.warn('auth.forbidden', { route: ROUTE, userId: user.id, data: { role: profile?.role } })
    return NextResponse.json({ error: 'Forbidden: teachers only' }, { status: 403 })
  }

  try {
    const res = await classroomGet(user.id, 'courses?teacherId=me&courseStates=ACTIVE')

    if (!res.ok) {
      const err = await res.text()
      logger.error('classroom.courses_fetch_failed', { route: ROUTE, userId: user.id, data: { status: res.status } })
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: res.status })
    }

    const data = await res.json()
    const courses = (data.courses || []).map((c: { id: string; name: string; section?: string }) => ({
      id: c.id,
      name: c.name,
      section: c.section || null,
    }))

    return NextResponse.json(courses)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('No valid Google access token')) {
      return NextResponse.json({ error: 'Google not connected', needsAuth: true }, { status: 401 })
    }
    logger.error('classroom.courses_error', { route: ROUTE, userId: user.id, data: { error: message } })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
