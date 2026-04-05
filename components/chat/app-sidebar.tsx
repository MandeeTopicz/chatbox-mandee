'use client'

import { useEffect, useRef, useState } from 'react'
import { Crown, LineChart, Layers, CloudSun, Calendar, LinkIcon, Check } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface AppConfig {
  id: string
  label: string
  icon: typeof Crown
  description: string
  prompt: string
  iconBg: string
  iconColor: string
  /** If set, this app requires an OAuth connection before use */
  oauthProvider?: string
}

const APPS: AppConfig[] = [
  {
    id: 'chess',
    label: 'Chess',
    icon: Crown,
    description: 'Play & learn',
    prompt: "Let's play a game of chess! I'll be white.",
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
  },
  {
    id: 'graphing',
    label: 'Graphing',
    icon: LineChart,
    description: 'Visualize equations',
    prompt: 'Can you graph the equation y = x^2 - 4?',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    icon: Layers,
    description: 'Quiz yourself',
    prompt: 'Start a flashcard quiz for me!',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  {
    id: 'weather',
    label: 'Weather',
    icon: CloudSun,
    description: 'Check forecasts',
    prompt: "What's the weather in New York?",
    iconBg: 'bg-sky-500/20',
    iconColor: 'text-sky-400',
  },
  {
    id: 'google-calendar',
    label: 'Calendar',
    icon: Calendar,
    description: 'Study schedule',
    prompt: 'Show me my upcoming events and help me plan my study schedule!',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    oauthProvider: 'google-calendar',
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connections, setConnections] = useState<Record<string, boolean>>({})
  const [connectionsLoaded, setConnectionsLoaded] = useState(false)

  useEffect(() => {
    loadConnections()
  }, [])

  // Auto-launch app after OAuth redirect (e.g., ?oauth_connected=spotify)
  useEffect(() => {
    if (!connectionsLoaded) return
    const connectedProvider = searchParams.get('oauth_connected')
    if (!connectedProvider) return

    const app = APPS.find((a) => a.oauthProvider === connectedProvider)
    if (app) {
      // Clean up the URL
      const url = new URL(window.location.href)
      url.searchParams.delete('oauth_connected')
      window.history.replaceState(null, '', url.pathname)

      // Launch the app
      setTimeout(() => {
        window.dispatchEvent(new Event('reset-chat'))
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('starter-prompt', { detail: app.prompt }))
        }, 150)
      }, 100)
    }
  }, [connectionsLoaded, searchParams])

  async function loadConnections() {
    try {
      const res = await fetch('/api/connections')
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections || {})
      }
    } catch {
      // Non-fatal
    } finally {
      setConnectionsLoaded(true)
    }
  }

  const pendingPromptRef = useRef<string | null>(null)

  // Fire pending prompt once we've landed on /chat
  useEffect(() => {
    if (pathname === '/chat' && pendingPromptRef.current) {
      const prompt = pendingPromptRef.current
      pendingPromptRef.current = null
      // Small delay to let ChatInterface mount/reset
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('starter-prompt', { detail: prompt }))
      }, 100)
    }
  }, [pathname])

  function launchApp(app: AppConfig) {
    // If app requires OAuth and user hasn't connected yet, redirect to OAuth
    if (app.oauthProvider && !connections[app.oauthProvider]) {
      window.location.href = `/api/auth/oauth/${app.oauthProvider}`
      return
    }

    if (pathname === '/chat') {
      window.dispatchEvent(new Event('reset-chat'))
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('starter-prompt', { detail: app.prompt }))
      }, 150)
    } else {
      // Navigate to /chat first, fire prompt once route settles
      pendingPromptRef.current = app.prompt
      router.push('/chat')
    }
  }

  return (
    <aside className="flex h-full w-20 flex-col items-center border-l border-indigo-800 bg-indigo-950 py-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Apps</p>
      <div className="flex flex-col gap-3">
        {APPS.map((app) => {
          const needsOAuth = app.oauthProvider && connectionsLoaded && !connections[app.oauthProvider]
          const isConnected = app.oauthProvider && connections[app.oauthProvider]

          return (
            <button
              key={app.id}
              onClick={() => launchApp(app)}
              className="group relative flex flex-col items-center gap-1.5 rounded-xl bg-indigo-900/50 p-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-lg"
              title={needsOAuth ? `Connect ${app.label}` : app.description}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${app.iconBg} ${app.iconColor} transition-transform duration-150 group-hover:scale-110`}>
                <app.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-indigo-300">{app.label}</span>

              {/* OAuth status badge */}
              {needsOAuth && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                  <LinkIcon className="h-2.5 w-2.5 text-white" />
                </div>
              )}
              {isConnected && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
