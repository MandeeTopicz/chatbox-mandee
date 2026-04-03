'use client'

import { AuthForm } from '@/components/auth/auth-form'

const TAGLINES = {
  login: {
    heading: 'Welcome back',
    sub: 'Sign in to continue learning',
  },
  signup: {
    heading: 'Join ChatBridge',
    sub: 'Your AI-powered learning platform',
  },
}

export function AuthPageLayout({ mode }: { mode: 'login' | 'signup' }) {
  const copy = TAGLINES[mode]

  return (
    <div className="flex min-h-screen">
      {/* Left panel — colored brand panel (hidden on mobile) */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-indigo-600 px-12 lg:flex">
        <div className="max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <span className="text-3xl font-bold text-white">CB</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{copy.heading}</h1>
          <p className="text-lg leading-relaxed text-indigo-100">
            {copy.sub}
          </p>
          <div className="mx-auto h-px w-16 bg-white/30" />
          <p className="text-sm text-indigo-200">
            Chess &middot; Graphing &middot; Quizzes &middot; AI Tutoring
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile-only branding */}
          <div className="space-y-2 text-center lg:hidden">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">ChatBridge</h1>
            <p className="text-sm text-slate-500">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </p>
          </div>
          {/* Desktop heading */}
          <div className="hidden space-y-1 lg:block">
            <h2 className="text-xl font-semibold text-slate-800">
              {mode === 'login' ? 'Sign in' : 'Create an account'}
            </h2>
            <p className="text-sm text-slate-500">
              {mode === 'login'
                ? 'Enter your credentials to continue'
                : 'Fill in the details below to get started'}
            </p>
          </div>
          <AuthForm mode={mode} />
        </div>
      </div>
    </div>
  )
}
