import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatLayoutShell } from '@/components/chat/chat-layout-shell'

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, role, school_id, first_login')
    .eq('id', user.id)
    .single()

  // Get school name if user has a school
  let schoolName: string | null = null
  if (profile?.school_id) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', profile.school_id)
      .single()
    schoolName = school?.name ?? null
  }

  return (
    <ChatLayoutShell
      userId={user.id}
      userEmail={user.email!}
      displayName={profile?.display_name ?? user.email!.split('@')[0]}
      role={profile?.role ?? 'student'}
      schoolName={schoolName}
      isFirstLogin={profile?.first_login ?? false}
    >
      {children}
    </ChatLayoutShell>
  )
}
