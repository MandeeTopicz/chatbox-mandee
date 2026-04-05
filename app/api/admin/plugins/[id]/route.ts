import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// PATCH /api/admin/plugins/[id] — approve or reject/disable a plugin
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
  if (typeof body.allowed !== 'boolean') {
    return NextResponse.json({ error: 'allowed (boolean) is required' }, { status: 400 })
  }

  const service = await createServiceClient()

  if (body.allowed) {
    const { data, error } = await service
      .from('plugins')
      .update({ allowed: true })
      .eq('id', id)
      .select('id, name, url, allowed, created_at')
      .single()

    if (error) {
      logger.error('admin.plugin_approve_failed', { route: '/api/admin/plugins/[id]', userId: user.id, data: { pluginId: id, error: error.message } })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.info('admin.plugin_approved', { route: '/api/admin/plugins/[id]', userId: user.id, data: { pluginId: id } })
    return NextResponse.json(data)
  } else {
    const { error } = await service
      .from('plugins')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('admin.plugin_delete_failed', { route: '/api/admin/plugins/[id]', userId: user.id, data: { pluginId: id, error: error.message } })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.info('admin.plugin_deleted', { route: '/api/admin/plugins/[id]', userId: user.id, data: { pluginId: id } })
    return new NextResponse(null, { status: 204 })
  }
}
