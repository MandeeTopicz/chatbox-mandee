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
    .select('display_name, role')
    .eq('id', user.id)
    .single()

  return (
    <ChatLayoutShell
      userId={user.id}
      userEmail={user.email!}
      displayName={profile?.display_name ?? user.email!.split('@')[0]}
      role={profile?.role ?? 'student'}
    >
      {children}
    </ChatLayoutShell>
  )
}
