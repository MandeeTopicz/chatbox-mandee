import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// PATCH /api/admin/users/[id] — update role or school
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
  const updates: Record<string, unknown> = {}

  if (body.role && ['student', 'teacher', 'admin'].includes(body.role)) {
    updates.role = body.role
  }
  if (body.school_id !== undefined) {
    updates.school_id = body.school_id || null
  }
  if (body.display_name !== undefined) {
    updates.display_name = body.display_name
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const service = await createServiceClient()

  const { error } = await service
    .from('users')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  logger.info('admin.user_updated', { route: '/api/admin/users/[id]', userId: user.id, data: { targetId: id, updates } })

  // Also update auth metadata so JWT stays in sync
  if (body.role) {
    await service.auth.admin.updateUserById(id, {
      user_metadata: { role: body.role },
    })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/users/[id] — remove a user
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Prevent self-deletion
  if (user.id === id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = await createServiceClient()

  const { error } = await service.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  logger.info('admin.user_deleted', { route: '/api/admin/users/[id]', userId: user.id, data: { deletedId: id } })
  return NextResponse.json({ ok: true })
}
