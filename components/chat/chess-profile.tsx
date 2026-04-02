'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'

interface ChessStats {
  wins: number
  losses: number
  draws: number
  streak: number
  rating: number
  hasProfile: boolean
}

export function ChessProfile() {
  const [stats, setStats] = useState<ChessStats | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const res = await fetch('/api/chess/profile')
    if (res.ok) {
      const data = await res.json()
      setStats(data)
    }
  }

  // Listen for game completions to refresh stats
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // SECURITY: This handler only triggers a profile refresh (read-only API call).
      // No origin validation needed — a forged PLUGIN_COMPLETE would only cause an
      // extra GET /api/chess/profile which returns the user's own data via RLS.
      if (event.data?.type === 'PLUGIN_COMPLETE') {
        setTimeout(loadProfile, 1500)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (!stats || !stats.hasProfile) return null

  const totalGames = stats.wins + stats.losses + stats.draws
  if (totalGames === 0) return null

  return (
    <div className="border-t px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-medium">Chess</span>
        <span className="text-muted-foreground">
          {stats.wins}W {stats.losses}L {stats.draws}D
        </span>
        {stats.streak > 0 && (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
            {stats.streak} streak
          </span>
        )}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Rating: {stats.rating}
      </div>
    </div>
  )
}
