import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// POST /api/admin/schools — create a school
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, district } = body

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const service = await createServiceClient()

  const { data, error } = await service
    .from('schools')
    .insert({ name: name.trim(), district: district?.trim() || null })
    .select('id, name, district')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  logger.info('admin.school_created', { route: '/api/admin/schools', userId: user.id, data: { schoolId: data.id, name: data.name } })
  return NextResponse.json(data, { status: 201 })
}
