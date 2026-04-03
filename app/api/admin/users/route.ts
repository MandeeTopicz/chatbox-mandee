import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const ROUTE = '/api/admin/users'

// POST /api/admin/users — create (invite) a user
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

  if (!profile || profile.role !== 'admin') {
    logger.warn('auth.forbidden', { route: ROUTE, userId: user.id, data: { role: profile?.role } })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, role, display_name, school_id, password } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }
  if (!role || !['student', 'teacher', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'role must be student, teacher, or admin' }, { status: 400 })
  }

  const service = await createServiceClient()

  const { data: newUser, error: createErr } = await service.auth.admin.createUser({
    email,
    password: password || 'Welcome123!',
    email_confirm: true,
    user_metadata: {
      role,
      display_name: display_name || email.split('@')[0],
      school_id: school_id || null,
    },
  })

  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 })
  }

  // Update school_id on the users row (trigger may not set it reliably)
  if (school_id && newUser.user) {
    await service
      .from('users')
      .update({ school_id })
      .eq('id', newUser.user.id)
  }

  logger.info('admin.user_created', { route: ROUTE, userId: user.id, data: { newUserId: newUser.user.id, role, email } })
  return NextResponse.json({ id: newUser.user.id, email }, { status: 201 })
}
