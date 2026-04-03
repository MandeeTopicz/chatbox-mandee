import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthPageLayout } from '@/components/auth/auth-page-layout'

export const metadata: Metadata = { title: 'Sign Up — ChatBridge' }

export default async function SignupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/chat')
  }

  return <AuthPageLayout mode="signup" />
}
