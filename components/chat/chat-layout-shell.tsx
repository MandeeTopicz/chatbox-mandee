'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Sidebar } from '@/components/chat/sidebar'

export function ChatLayoutShell({
  children,
  userId,
  userEmail,
  displayName,
  role,
}: {
  children: React.ReactNode
  userId: string
  userEmail: string
  displayName: string
  role: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on md+, slide-in on mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          userId={userId}
          userEmail={userEmail}
          displayName={displayName}
          role={role}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header with hamburger */}
        <div className="flex items-center border-b px-3 py-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 hover:bg-accent"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-2 text-sm font-semibold">ChatBridge</span>
        </div>
        {children}
      </main>
    </div>
  )
}
