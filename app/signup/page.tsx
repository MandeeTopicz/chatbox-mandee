import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthForm } from '@/components/auth/auth-form'

export const metadata: Metadata = { title: 'Sign Up — ChatBridge' }

export default async function SignupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/chat')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">ChatBridge</h1>
          <p className="text-sm text-muted-foreground">
            Create your TutorMeAI account
          </p>
        </div>
        <AuthForm mode="signup" />
      </div>
    </div>
  )
}
