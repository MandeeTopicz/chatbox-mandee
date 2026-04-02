'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/app/auth/actions'
import { MessageSquarePlus, LogOut, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChessProfile } from '@/components/chat/chess-profile'

interface Conversation {
  id: string
  title: string
  updated_at: string
}

export function Sidebar({
  userEmail,
  displayName,
  role,
  onNavigate,
}: {
  userId: string
  userEmail: string
  displayName: string
  role: string
  onNavigate?: () => void
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    loadConversations()
  }, [pathname])

  // Listen for conversation updates from ChatInterface
  useEffect(() => {
    const handler = () => loadConversations()
    window.addEventListener('conversation-updated', handler)
    return () => window.removeEventListener('conversation-updated', handler)
  }, [])

  async function loadConversations() {
    const res = await fetch('/api/conversations')
    if (res.ok) {
      const data = await res.json()
      setConversations(data)
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

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">ChatBridge</h2>
        <Link
          href="/chat"
          className="rounded-md p-1.5 hover:bg-accent"
          title="New chat"
          onClick={onNavigate}
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Link>
      </div>

      {/* Conversation list */}
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
                    'group flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent',
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

      {/* Chess profile */}
      <ChessProfile />

      {/* User info + logout */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {userEmail} &middot; {role}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md p-1.5 hover:bg-accent"
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
