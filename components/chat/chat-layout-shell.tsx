'use client'

import { createContext, useContext, useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/chat/sidebar'

export interface UserProfileContext {
  userId: string
  userEmail: string
  displayName: string
  role: string
  schoolName: string | null
  isFirstLogin: boolean
}

const ProfileContext = createContext<UserProfileContext | null>(null)

export function useUserProfile(): UserProfileContext | null {
  return useContext(ProfileContext)
}

export function ChatLayoutShell({
  children,
  userId,
  userEmail,
  displayName,
  role,
  schoolName,
  isFirstLogin,
}: {
  children: React.ReactNode
  userId: string
  userEmail: string
  displayName: string
  role: string
  schoolName?: string | null
  isFirstLogin?: boolean
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const profileValue: UserProfileContext = {
    userId,
    userEmail,
    displayName,
    role,
    schoolName: schoolName ?? null,
    isFirstLogin: isFirstLogin ?? false,
  }

  return (
    <ProfileContext.Provider value={profileValue}>
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
            schoolName={schoolName ?? null}
            onNavigate={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header with hamburger */}
          <div className="flex items-center border-b border-slate-200 px-3 py-2 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 transition-colors duration-150 hover:bg-slate-100"
              title="Open menu"
            >
              <Menu className="h-5 w-5 text-slate-600" />
            </button>
            <span className="ml-2 text-sm font-semibold text-slate-800">ChatBridge</span>
          </div>
          {children}
        </main>
      </div>
    </ProfileContext.Provider>
  )
}
