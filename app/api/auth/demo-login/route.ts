import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const ROUTE = '/api/auth/demo-login'

const DEMO_ACCOUNTS: Record<string, { email: string; password: string; redirect: string }> = {
  admin: {
    email: 'admin@gauntlet.edu',
    password: 'Demo1234!',
    redirect: '/admin',
  },
  teacher: {
    email: 'teacher@gauntlet.edu',
    password: 'Demo1234!',
    redirect: '/teacher',
  },
  student: {
    email: 'student@gauntlet.edu',
    password: 'Demo1234!',
    redirect: '/chat',
  },
}

export async function POST(request: Request) {
  const body = await request.json()
  const { role } = body

  const account = DEMO_ACCOUNTS[role]
  if (!account) {
    logger.warn('demo_login.invalid_role', { route: ROUTE, data: { role } })
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  })

  if (error) {
    logger.error('demo_login.failed', { route: ROUTE, data: { role, error: error.message } })
    return NextResponse.json(
      { error: `Demo login failed: ${error.message}` },
      { status: 401 }
    )
  }

  logger.info('demo_login.success', { route: ROUTE, data: { role } })
  return NextResponse.json({ redirect: account.redirect })
}
