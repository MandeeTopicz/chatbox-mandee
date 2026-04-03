'use client'

import { ChatInterface } from '@/components/chat/chat-interface'
import { useUserProfile } from '@/components/chat/chat-layout-shell'
import { useParams } from 'next/navigation'

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const profile = useUserProfile()

  return (
    <ChatInterface
      conversationId={conversationId}
      userProfile={
        profile
          ? {
              displayName: profile.displayName,
              role: profile.role,
              isFirstLogin: profile.isFirstLogin,
            }
          : undefined
      }
    />
  )
}
