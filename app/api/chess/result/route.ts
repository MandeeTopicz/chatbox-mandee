import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const ROUTE = '/api/chess/result'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    logger.warn('auth.unauthorized', { route: ROUTE })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { outcome } = body

  if (!outcome || !['win', 'loss', 'draw'].includes(outcome)) {
    return NextResponse.json(
      { error: 'outcome must be "win", "loss", or "draw"' },
      { status: 400 }
    )
  }

  // Get current profile or create one
  const { data: existing } = await supabase
    .from('chess_profiles')
    .select('wins, losses, draws, streak, rating')
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    // Create initial profile with this game's result
    const profile = {
      user_id: user.id,
      wins: outcome === 'win' ? 1 : 0,
      losses: outcome === 'loss' ? 1 : 0,
      draws: outcome === 'draw' ? 1 : 0,
      streak: outcome === 'win' ? 1 : 0,
      rating: calculateNewRating(1200, outcome),
    }

    const { error } = await supabase.from('chess_profiles').insert(profile)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(profile)
  }

  // Update existing profile
  const newStreak =
    outcome === 'win'
      ? (existing.streak > 0 ? existing.streak + 1 : 1)
      : 0

  const update = {
    wins: existing.wins + (outcome === 'win' ? 1 : 0),
    losses: existing.losses + (outcome === 'loss' ? 1 : 0),
    draws: existing.draws + (outcome === 'draw' ? 1 : 0),
    streak: newStreak,
    rating: calculateNewRating(existing.rating, outcome),
  }

  const { error } = await supabase
    .from('chess_profiles')
    .update(update)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(update)
}

/**
 * Simple Elo-like rating adjustment.
 * Win: +25, Loss: -20, Draw: +5
 * Floor at 100.
 */
function calculateNewRating(currentRating: number, outcome: string): number {
  let delta: number
  switch (outcome) {
    case 'win':
      delta = 25
      break
    case 'loss':
      delta = -20
      break
    case 'draw':
      delta = 5
      break
    default:
      delta = 0
  }
  return Math.max(100, currentRating + delta)
}
