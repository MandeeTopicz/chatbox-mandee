'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login, signup } from '@/app/auth/actions'
import { Loader2 } from 'lucide-react'

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function fillDemo(email: string, password: string, displayName: string, role: string) {
    const form = document.querySelector('form') as HTMLFormElement
    const emailInput = form.querySelector('#email') as HTMLInputElement
    const passwordInput = form.querySelector('#password') as HTMLInputElement
    const nameInput = form.querySelector('#displayName') as HTMLInputElement | null
    const roleSelect = form.querySelector('#role') as HTMLSelectElement | null

    emailInput.value = email
    passwordInput.value = password
    if (nameInput) nameInput.value = displayName
    if (roleSelect) roleSelect.value = role

    // Auto-submit
    const fd = new FormData()
    fd.set('email', email)
    fd.set('password', password)
    fd.set('displayName', displayName)
    fd.set('role', role)
    handleSubmit(fd)
  }

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

  return (
    <form action={handleSubmit} className="space-y-4">
      {mode === 'signup' && (
        <>
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">
              Display Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="Your name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue="student"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
        </>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@school.edu"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="At least 6 characters"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : mode === 'login' ? (
          'Sign In'
        ) : (
          'Create Account'
        )}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>

      {/* Demo quick-login pills */}
      <div className="space-y-2 border-t pt-4">
        <p className="text-center text-xs text-muted-foreground">Demo accounts</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => fillDemo('student@demo.com', 'demo123456', 'Student Demo', 'student')}
            className="flex-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            Student Demo
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => fillDemo('teacher@demo.com', 'demo123456', 'Teacher Demo', 'teacher')}
            className="flex-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            Teacher Demo
          </button>
        </div>
      </div>
    </form>
  )
}
