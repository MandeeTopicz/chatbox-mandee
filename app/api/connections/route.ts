import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Returns which OAuth providers the current user has connected.
 * Response: { connections: { spotify: boolean, google: boolean, ... } }
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Use service client to bypass RLS
  const serviceClient = await createServiceClient()
  const { data: tokens, error } = await serviceClient
    .from('google_tokens')
    .select('provider')
    .eq('user_id', user.id) as { data: { provider: string }[] | null; error: { message: string } | null }

  if (error) {
    console.error('[connections] Failed to fetch tokens:', error.message)
  }

  const connections: Record<string, boolean> = {}
  for (const row of tokens || []) {
    connections[row.provider] = true
  }

  return NextResponse.json({ connections })
}
