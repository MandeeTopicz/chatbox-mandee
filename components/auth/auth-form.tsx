'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, signup } from '@/app/auth/actions'
import { Loader2, Shield, GraduationCap, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type SelectedRole = 'student' | 'teacher' | 'admin'

const ROLE_CONFIG: Record<
  SelectedRole,
  {
    bg: string
    activeBg: string
    activeBorder: string
    activeText: string
    ring: string
    copy: string
    tagline: string
  }
> = {
  student: {
    bg: 'bg-indigo-600',
    activeBg: 'bg-indigo-600 text-white',
    activeBorder: 'border-indigo-600',
    activeText: 'text-indigo-700',
    ring: 'focus-visible:ring-indigo-400',
    copy: 'Ready to start learning',
    tagline: 'Your AI-powered learning companion',
  },
  teacher: {
    bg: 'bg-slate-800',
    activeBg: 'bg-slate-800 text-white',
    activeBorder: 'border-slate-800',
    activeText: 'text-slate-800',
    ring: 'focus-visible:ring-slate-600',
    copy: 'Set up your classroom',
    tagline: 'Tools to empower your teaching',
  },
  admin: {
    bg: 'bg-slate-700',
    activeBg: 'bg-slate-700 text-white',
    activeBorder: 'border-slate-700',
    activeText: 'text-slate-700',
    ring: 'focus-visible:ring-slate-400',
    copy: 'Manage your school',
    tagline: 'Full visibility across your school',
  },
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('student')
  const router = useRouter()

  const roleConfig = ROLE_CONFIG[selectedRole]

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const action = mode === 'login' ? login : signup
    const result = await action(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleDemoLogin(role: string) {
    setDemoLoading(role)
    setError(null)

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Demo login failed')
        setDemoLoading(null)
        return
      }

      router.push(data.redirect)
      router.refresh()
    } catch {
      setError('Demo login failed')
      setDemoLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <>
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium text-slate-700">
                Display Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="Your name"
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors duration-150"
              />
            </div>

            {/* Role pill selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">I am a...</label>
              <input type="hidden" name="role" value={selectedRole} />
              <div className="grid grid-cols-3 gap-2">
                {(['student', 'teacher', 'admin'] as SelectedRole[]).map((r) => {
                  const cfg = ROLE_CONFIG[r]
                  const active = selectedRole === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-full border-2 px-3 py-2 text-xs font-semibold capitalize transition-all duration-150',
                        active
                          ? `${cfg.activeBg} ${cfg.activeBorder}`
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                      )}
                    >
                      {r === 'student' && <BookOpen className="h-3.5 w-3.5" />}
                      {r === 'teacher' && <GraduationCap className="h-3.5 w-3.5" />}
                      {r === 'admin' && <Shield className="h-3.5 w-3.5" />}
                      {r}
                    </button>
                  )
                })}
              </div>
              <p className={cn('text-xs font-medium transition-colors duration-150', roleConfig.activeText)}>
                {roleConfig.copy}
              </p>
            </div>
          </>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@school.edu"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors duration-150"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors duration-150"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !!demoLoading}
          className={cn(
            'flex h-11 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 disabled:opacity-50',
            mode === 'signup' ? roleConfig.bg : 'bg-indigo-600',
            mode === 'signup' ? '' : 'hover:bg-indigo-700'
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'login' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>

        <p className="text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
                Sign in
              </Link>
            </>
          )}
        </p>
      </form>

      {/* Demo Access section */}
      <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
        <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Demo Access
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={loading || !!demoLoading}
            onClick={() => handleDemoLogin('admin')}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 transition-all duration-150 hover:border-slate-400 hover:shadow-sm active:scale-95 disabled:opacity-50"
          >
            {demoLoading === 'admin' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 text-violet-500" />
            )}
            Admin
          </button>
          <button
            type="button"
            disabled={loading || !!demoLoading}
            onClick={() => handleDemoLogin('teacher')}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 transition-all duration-150 hover:border-blue-400 hover:shadow-sm active:scale-95 disabled:opacity-50"
          >
            {demoLoading === 'teacher' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GraduationCap className="h-4 w-4 text-blue-500" />
            )}
            Teacher
          </button>
          <button
            type="button"
            disabled={loading || !!demoLoading}
            onClick={() => handleDemoLogin('student')}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 transition-all duration-150 hover:border-indigo-400 hover:shadow-sm active:scale-95 disabled:opacity-50"
          >
            {demoLoading === 'student' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4 text-indigo-500" />
            )}
            Student
          </button>
        </div>
      </div>
    </div>
  )
}
