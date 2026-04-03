'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/app/auth/actions'
import { MessageSquarePlus, LogOut, Trash2, Trophy, BookOpen, Crown, LineChart, Layers, CloudSun, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  title: string
  updated_at: string
}

interface ChessStats {
  wins: number
  losses: number
  draws: number
  hasProfile: boolean
}

export function Sidebar({
  userEmail,
  displayName,
  role,
  schoolName,
  onNavigate,
}: {
  userId: string
  userEmail: string
  displayName: string
  role: string
  schoolName: string | null
  onNavigate?: () => void
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [chessStats, setChessStats] = useState<ChessStats | null>(null)
  const [quizzesCompleted, setQuizzesCompleted] = useState<number>(0)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    loadConversations()
    if (role === 'student') {
      loadStudentStats()
    }
  }, [pathname])

  useEffect(() => {
    const handler = () => loadConversations()
    window.addEventListener('conversation-updated', handler)
    return () => window.removeEventListener('conversation-updated', handler)
  }, [])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'PLUGIN_COMPLETE') {
        setTimeout(() => {
          if (role === 'student') loadStudentStats()
        }, 1500)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function loadConversations() {
    const res = await fetch('/api/conversations')
    if (res.ok) {
      const data = await res.json()
      setConversations(data)
    }
  }

  async function loadStudentStats() {
    const chessRes = await fetch('/api/chess/profile')
    if (chessRes.ok) {
      const data = await chessRes.json()
      setChessStats(data)
    }

    const quizRes = await fetch('/api/users/stats')
    if (quizRes.ok) {
      const data = await quizRes.json()
      setQuizzesCompleted(data.quizzes_completed ?? 0)
    }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (pathname === `/chat/${id}`) {
        router.push('/chat')
      }
    }
  }

  function startNewChat() {
    if (pathname === '/chat') {
      // Already on /chat — dispatch reset event to clear ChatInterface state
      window.dispatchEvent(new Event('reset-chat'))
    } else {
      router.push('/chat')
    }
    onNavigate?.()
  }

  function startNewChatWithPrompt(prompt: string) {
    if (pathname === '/chat') {
      window.dispatchEvent(new Event('reset-chat'))
    } else {
      router.push('/chat')
    }
    onNavigate?.()
    // Wait for ChatInterface to mount/reset, then send the prompt
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('starter-prompt', { detail: prompt }))
    }, 150)
  }

  const isStudent = role === 'student'

  // Student gets a dark indigo sidebar
  if (isStudent) {
    return (
      <aside className="flex h-full w-64 flex-col bg-indigo-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-800 px-4 py-4">
          <h2 className="text-lg font-semibold text-white">ChatBridge</h2>
        </div>

        {/* Student identity & stats */}
        <div className="border-b border-indigo-800 px-4 py-3 space-y-2.5">
          <div>
            <p className="text-sm font-semibold text-white">{displayName}</p>
            {schoolName && (
              <p className="text-xs text-indigo-300">{schoolName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {chessStats?.hasProfile && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-800 px-2.5 py-1 text-[11px] font-medium text-indigo-200">
                <Trophy className="h-3 w-3 text-amber-400" />
                {chessStats.wins}W/{chessStats.losses}L/{chessStats.draws}D
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-indigo-800 px-2.5 py-1 text-[11px] font-medium text-indigo-200">
              <BookOpen className="h-3 w-3 text-indigo-400" />
              {quizzesCompleted}
            </span>
          </div>
        </div>

        {/* Tool shortcut buttons */}
        <div className="flex items-center gap-2 border-b border-indigo-800 px-4 py-2.5">
          <button
            onClick={() => {
              startNewChatWithPrompt("Let's play a game of chess! I'll be white.")
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-800 text-indigo-400 transition-colors duration-150 hover:bg-indigo-700 hover:text-indigo-300"
            title="Start a chess game"
          >
            <Crown className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              startNewChatWithPrompt('Can you graph the equation y = x^2 - 4?')
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-800 text-indigo-400 transition-colors duration-150 hover:bg-indigo-700 hover:text-indigo-300"
            title="Open graphing calculator"
          >
            <LineChart className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              startNewChatWithPrompt('Start a flashcard quiz for me!')
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-800 text-indigo-400 transition-colors duration-150 hover:bg-indigo-700 hover:text-indigo-300"
            title="Start a flashcard quiz"
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              startNewChatWithPrompt("What's the weather in New York?")
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-800 text-indigo-400 transition-colors duration-150 hover:bg-indigo-700 hover:text-indigo-300"
            title="Check the weather"
          >
            <CloudSun className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={startNewChat}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-400 px-3 text-xs font-semibold text-indigo-950 transition-colors duration-150 hover:bg-amber-300"
            title="New chat"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-indigo-400">
              No conversations yet
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <Link
                    href={`/chat/${conv.id}`}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-indigo-200 transition-colors duration-150 hover:bg-indigo-800',
                      pathname === `/chat/${conv.id}` && 'bg-indigo-800 text-white'
                    )}
                  >
                    <span className="truncate">{conv.title}</span>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="hidden rounded p-1 text-indigo-400 hover:bg-indigo-700 hover:text-indigo-200 group-hover:block"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* Logout */}
        <div className="border-t border-indigo-800 p-3">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg p-2 text-xs text-indigo-400 transition-colors duration-150 hover:bg-indigo-800 hover:text-indigo-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    )
  }

  // Default sidebar for teacher/admin
  const dashboardPath = role === 'admin' ? '/admin' : '/teacher'
  const dashboardLabel = role === 'admin' ? 'Admin Dashboard' : 'Teacher Dashboard'

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold text-slate-800">ChatBridge</h2>
        <button
          onClick={startNewChat}
          className="rounded-md p-1.5 transition-colors duration-150 hover:bg-accent"
          title="New chat"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </div>

      {/* Dashboard link */}
      <div className="border-b px-3 py-2">
        <Link
          href={dashboardPath}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-800"
        >
          <LayoutDashboard className="h-4 w-4" />
          {dashboardLabel}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            No conversations yet
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <Link
                  href={`/chat/${conv.id}`}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors duration-150 hover:bg-accent',
                    pathname === `/chat/${conv.id}` && 'bg-accent'
                  )}
                >
                  <span className="truncate">{conv.title}</span>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="hidden rounded p-1 hover:bg-destructive/10 group-hover:block"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{displayName}</p>
            <p className="truncate text-xs text-slate-500">
              {userEmail} &middot; {role}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md p-1.5 transition-colors duration-150 hover:bg-accent"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
