import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // RLS ensures user can only see their own profile
  const { data: profile } = await supabase
    .from('chess_profiles')
    .select('wins, losses, draws, streak, rating, updated_at')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    // No profile yet — return zeroes
    return NextResponse.json({
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      rating: 1200,
      hasProfile: false,
    })
  }

  return NextResponse.json({ ...profile, hasProfile: true })
}
