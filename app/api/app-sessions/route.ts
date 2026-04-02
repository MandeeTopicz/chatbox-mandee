import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId, pluginId, state } = await request.json()

  if (!conversationId || !pluginId) {
    return NextResponse.json({ error: 'conversationId and pluginId required' }, { status: 400 })
  }

  // Upsert the app session state
  const { error } = await supabase
    .from('app_sessions')
    .upsert(
      {
        conversation_id: conversationId,
        plugin_id: pluginId,
        state_blob: state,
      },
      { onConflict: 'conversation_id,plugin_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
